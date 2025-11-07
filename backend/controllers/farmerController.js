const Profile = require('../models/Profile');
const Verification = require('../models/Verification');

exports.getProfile = async (req, res) => {
  try {
    const profile = await Profile.getByUserId(req.user.userId);
    res.json({ success: true, data: profile });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch profile' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const profile = await Profile.upsertFarmerProfile(req.user.userId, req.body);
    // Don't change verification status on profile update
    // Let farmers work on their profile without appearing in admin list
    res.json({ success: true, message: 'Profile updated', data: profile });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
};

exports.uploadDocuments = async (req, res) => {
  try {
    const { documents } = req.body; // [{doc_type, file_data}]
    if (!Array.isArray(documents) || documents.length === 0) {
      return res.status(400).json({ success: false, message: 'No documents provided' });
    }

    await Verification.createTables();

    const results = [];
    for (const doc of documents) {
      if (!doc.doc_type) continue;
      const saved = await Verification.addDocument(req.user.userId, doc.doc_type, doc.file_data || null);
      results.push(saved);
    }

    // Set status to PENDING_REVIEW - farmer is now submitting for verification
    // This is when they should appear in the admin verification list
    await Profile.setVerificationStatus(req.user.userId, 'PENDING_REVIEW');

    res.json({ success: true, message: 'Documents uploaded and submitted for review', data: results });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to upload documents' });
  }
};

exports.getVerificationStatus = async (req, res) => {
  try {
    const profile = await Profile.getByUserId(req.user.userId);
    const docs = await Verification.listDocuments(req.user.userId);
    res.json({ success: true, data: { verification_status: profile?.verification_status, documents: docs, reason: profile?.verification_reason || null } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch verification status' });
  }
};


