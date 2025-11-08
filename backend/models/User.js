const supabase = require('../config/supabase');
const bcrypt = require('bcrypt');

class User {
  static async createTable() {
    console.log('ℹ️  Skipping table creation at runtime. Manage schema in Supabase.');
  }

  static async findByEmailOrPhone(email, phone) {
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .or(`email.eq.${email || ''},phone.eq.${phone || ''}`)
        .limit(1);

      if (error) throw error;
      const user = users && users[0];
      if (!user) return null;

      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('profile_id, full_name, farm_name, verification_status')
        .eq('user_id', user.user_id)
        .limit(1);

      if (profileError) throw profileError;

      const profile = profiles && profiles[0];
      return {
        user_id: user.user_id,
        email: user.email,
        phone: user.phone,
        password_hash: user.password_hash,
        role: user.role,
        created_at: user.created_at,
        profile_id: profile?.profile_id || null,
        full_name: profile?.full_name || null,
        farm_name: profile?.farm_name || null,
        verification_status: profile?.verification_status || null,
      };
    } catch (error) {
      console.error('Error finding user:', error);
      throw error;
    }
  }

  static async create(userData) {
    const { email, phone, password, role } = userData;
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    try {
      const { data: insertedUsers, error: insertError } = await supabase
        .from('users')
        .insert([{ email: email || null, phone: phone || null, password_hash: passwordHash, role }])
        .select('user_id, email, phone, role, created_at')
        .limit(1);

      if (insertError) {
        const msg = insertError?.message || '';
        if (msg.includes('users_email_key') || msg.toLowerCase().includes('email') && msg.toLowerCase().includes('already')) {
          throw new Error('Email already exists');
        }
        if (msg.includes('users_phone_key') || msg.toLowerCase().includes('phone') && msg.toLowerCase().includes('already')) {
          throw new Error('Phone number already exists');
        }
        throw insertError;
      }

      const user = insertedUsers && insertedUsers[0];

      const { error: profileInsertError } = await supabase
        .from('profiles')
        .insert([{ user_id: user.user_id }]);

      if (profileInsertError) throw profileInsertError;

      return {
        user_id: user.user_id,
        email: user.email,
        phone: user.phone,
        role: user.role,
        created_at: user.created_at,
      };
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  // Create user for OAuth (no password required)
  static async createOAuthUser(userData) {
    const { email, phone, role, full_name } = userData;
    
    // Generate a random password hash for OAuth users (they won't use it)
    const saltRounds = 10;
    const randomPassword = require('crypto').randomBytes(32).toString('hex');
    const passwordHash = await bcrypt.hash(randomPassword, saltRounds);

    try {
      const { data: insertedUsers, error: insertError } = await supabase
        .from('users')
        .insert([{ email: email || null, phone: phone || null, password_hash: passwordHash, role }])
        .select('user_id, email, phone, role, created_at')
        .limit(1);

      if (insertError) {
        const msg = insertError?.message || '';
        if (msg.includes('users_email_key') || msg.toLowerCase().includes('email') && msg.toLowerCase().includes('already')) {
          throw new Error('Email already exists');
        }
        if (msg.includes('users_phone_key') || msg.toLowerCase().includes('phone') && msg.toLowerCase().includes('already')) {
          throw new Error('Phone number already exists');
        }
        throw insertError;
      }

      const user = insertedUsers && insertedUsers[0];

      // Create profile with full_name if provided
      const profileData = { user_id: user.user_id };
      if (full_name) {
        profileData.full_name = full_name;
      }

      const { error: profileInsertError } = await supabase
        .from('profiles')
        .insert([profileData]);

      if (profileInsertError) throw profileInsertError;

      return {
        user_id: user.user_id,
        email: user.email,
        phone: user.phone,
        role: user.role,
        created_at: user.created_at,
      };
    } catch (error) {
      console.error('Error creating OAuth user:', error);
      throw error;
    }
  }

  static async verifyPassword(password, passwordHash) {
    return await bcrypt.compare(password, passwordHash);
  }

  static async findById(userId) {
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('user_id, email, phone, role, created_at')
        .eq('user_id', userId)
        .limit(1);

      if (error) throw error;
      const user = users && users[0];
      if (!user) return null;

      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('profile_id, full_name, farm_name, verification_status')
        .eq('user_id', user.user_id)
        .limit(1);

      if (profileError) throw profileError;
      const profile = profiles && profiles[0];

      return {
        user_id: user.user_id,
        email: user.email,
        phone: user.phone,
        role: user.role,
        created_at: user.created_at,
        profile_id: profile?.profile_id || null,
        full_name: profile?.full_name || null,
        farm_name: profile?.farm_name || null,
        verification_status: profile?.verification_status || null,
      };
    } catch (error) {
      console.error('Error finding user by ID:', error);
      throw error;
    }
  }
}

module.exports = User;

