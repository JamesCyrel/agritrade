const supabase = require('../config/supabase');

class Verification {
  static async createTables() {
    console.log('ℹ️  Skipping runtime verification table creation. Manage schema in Supabase.');
  }

  static async addDocument(userId, doc_type, file_data) {
    const { data, error } = await supabase
      .from('verification_documents')
      .insert([{ user_id: userId, doc_type, file_data: file_data || null }])
      .select('id, doc_type, created_at')
      .single();
    if (error) throw error;
    return data;
  }

  static async listDocuments(userId) {
    const { data, error } = await supabase
      .from('verification_documents')
      .select('id, doc_type, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }
}

module.exports = Verification;


