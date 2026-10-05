import { Customer, Transaction, Alert, RiskScore } from '../models/index.js';
import { recordAuditLog } from '../middlewares/auditLogger.js';

export const getCustomers = async (req, res, next) => {
  try {
    const {
      search,
      riskCategory,
      kycStatus,
      page = 1,
      limit = 50
    } = req.query;

    const filter = {};

    if (riskCategory) filter.riskCategory = riskCategory;
    if (kycStatus) filter.kycStatus = kycStatus;

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [
        { fullName: searchRegex },
        { customerId: searchRegex },
        { accountNumber: searchRegex },
        { occupation: searchRegex }
      ];
    }

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);

    const [customers, total] = await Promise.all([
      Customer.find(filter)
        .sort({ customerRiskScore: -1, createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Customer.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      data: {
        customers,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (err) {
    next(err);
  }
};

export const getCustomerById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const customer = await Customer.findOne({
      $or: [
        { customerId: id },
        { accountNumber: id },
        { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }
      ]
    }).lean();

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: `Customer '${id}' not found`
      });
    }

    // Retrieve transactions associated with this customer
    const transactions = await Transaction.find({
      $or: [
        { sourceCustomerId: customer.customerId },
        { destinationCustomerId: customer.customerId },
        { sourceAccountId: customer.accountNumber },
        { destinationAccountId: customer.accountNumber }
      ]
    })
      .sort({ timestamp: -1 })
      .limit(100)
      .populate('ruleHits')
      .lean();

    // Retrieve alerts generated for this customer
    const alerts = await Alert.find({
      customerId: customer.customerId
    })
      .sort({ createdAt: -1 })
      .lean();

    // Calculate customer metrics
    let totalInflowINR = 0;
    let totalOutflowINR = 0;
    let suspiciousTxCount = 0;

    transactions.forEach((tx) => {
      const isOutflow = tx.sourceCustomerId === customer.customerId || tx.sourceAccountId === customer.accountNumber;
      if (isOutflow) {
        totalOutflowINR += tx.normalizedAmountINR || 0;
      } else {
        totalInflowINR += tx.normalizedAmountINR || 0;
      }
      if (tx.isSuspicious) {
        suspiciousTxCount++;
      }
    });

    res.status(200).json({
      success: true,
      data: {
        customer,
        transactions,
        alerts,
        metrics: {
          totalTransactions: transactions.length,
          totalInflowINR,
          totalOutflowINR,
          totalVolumeINR: totalInflowINR + totalOutflowINR,
          suspiciousTxCount,
          alertCount: alerts.length
        }
      }
    });
  } catch (err) {
    next(err);
  }
};

export const createCustomer = async (req, res, next) => {
  try {
    const {
      fullName,
      dob,
      gender = 'OTHER',
      address,
      street,
      city,
      state,
      countryCode,
      postalCode,
      nationality = 'Indian',
      occupation,
      monthlyIncome,
      accountType = 'SAVINGS',
      accountNumber,
      pepStatus = false,
      sanctioned = false,
      kycStatus = 'VERIFIED',
      riskCategory,
      customerRiskScore,
      previousAlertCount = 0
    } = req.body;

    if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Field fullName is required and must be at least 3 characters.'
      });
    }

    if (!occupation || typeof occupation !== 'string' || !occupation.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Field occupation is required.'
      });
    }

    if (monthlyIncome === undefined || monthlyIncome === null || Number(monthlyIncome) < 0 || isNaN(Number(monthlyIncome))) {
      return res.status(400).json({
        success: false,
        message: 'Field monthlyIncome must be a valid non-negative number.'
      });
    }

    // Auto-generate customerId if not provided
    let finalCustomerId = req.body.customerId?.trim();
    if (!finalCustomerId) {
      const count = await Customer.countDocuments();
      finalCustomerId = `CUST-IND-${7001 + count}`;
    }

    // Auto-generate accountNumber if not provided
    let finalAccountNumber = accountNumber?.trim();
    if (!finalAccountNumber) {
      const rand1 = Math.floor(1000 + Math.random() * 9000);
      const rand2 = Math.floor(100000 + Math.random() * 900000);
      finalAccountNumber = `ACC-${rand1}-${rand2}`;
    }

    // Check duplicate customerId or accountNumber
    const existing = await Customer.findOne({
      $or: [{ customerId: finalCustomerId }, { accountNumber: finalAccountNumber }]
    }).lean();

    if (existing) {
      const conflict = existing.customerId === finalCustomerId ? 'customerId' : 'accountNumber';
      return res.status(400).json({
        success: false,
        message: `Customer with ${conflict} '${conflict === 'customerId' ? finalCustomerId : finalAccountNumber}' already exists.`
      });
    }

    // Determine default risk category & score
    let finalRiskCategory = riskCategory;
    let finalRiskScore = customerRiskScore !== undefined && customerRiskScore !== '' ? Number(customerRiskScore) : null;

    if (!finalRiskCategory) {
      if (sanctioned) finalRiskCategory = 'CRITICAL';
      else if (pepStatus) finalRiskCategory = 'HIGH';
      else if (Number(monthlyIncome) > 1000000) finalRiskCategory = 'MEDIUM';
      else finalRiskCategory = 'LOW';
    }

    if (finalRiskScore === null) {
      if (finalRiskCategory === 'CRITICAL') finalRiskScore = 95;
      else if (finalRiskCategory === 'HIGH') finalRiskScore = 75;
      else if (finalRiskCategory === 'MEDIUM') finalRiskScore = 45;
      else finalRiskScore = 15;
    }

    const cCode = (countryCode || address?.countryCode || 'IN').toUpperCase();

    const customer = await Customer.create({
      customerId: finalCustomerId,
      fullName: fullName.trim(),
      dob: dob ? new Date(dob) : new Date('1990-01-01'),
      gender: ['MALE', 'FEMALE', 'OTHER'].includes(gender) ? gender : 'OTHER',
      address: {
        street: street || address?.street || '',
        city: city || address?.city || 'Mumbai',
        state: state || address?.state || 'Maharashtra',
        countryCode: cCode,
        postalCode: postalCode || address?.postalCode || '400001'
      },
      nationality: nationality.trim(),
      occupation: occupation.trim(),
      monthlyIncome: Number(monthlyIncome),
      accountType: ['SAVINGS', 'CURRENT', 'NRI', 'CORPORATE', 'WALLET'].includes(accountType) ? accountType : 'SAVINGS',
      accountNumber: finalAccountNumber,
      pepStatus: Boolean(pepStatus),
      sanctioned: Boolean(sanctioned),
      kycStatus: ['VERIFIED', 'PENDING', 'EXPIRED', 'REJECTED'].includes(kycStatus) ? kycStatus : 'VERIFIED',
      riskCategory: finalRiskCategory,
      customerRiskScore: finalRiskScore,
      previousAlertCount: Number(previousAlertCount || 0)
    });

    // Record immutable audit log
    await recordAuditLog({
      req,
      userId: req.user?._id || null,
      username: req.user?.username || 'SYSTEM',
      userRole: req.user?.role || 'AML_ANALYST',
      action: 'CUSTOMER_CREATED',
      entity: 'CUSTOMER',
      entityId: customer.customerId,
      previousValue: null,
      newValue: {
        customerId: customer.customerId,
        fullName: customer.fullName,
        accountNumber: customer.accountNumber,
        riskCategory: customer.riskCategory,
        customerRiskScore: customer.customerRiskScore
      }
    });

    res.status(201).json({
      success: true,
      message: `Customer '${customer.fullName}' created successfully with ID ${customer.customerId}`,
      data: customer
    });
  } catch (err) {
    next(err);
  }
};

export default {
  getCustomers,
  getCustomerById,
  createCustomer
};
