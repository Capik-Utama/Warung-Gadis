import React, { useState } from 'react';
import { supabase } from '../config/supabase';

const SetupDatabase = () => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const hashPassword = async (password: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  };

  const runSetup = async () => {
    setStatus('loading');
    setMessage('Menjalankan setup database...');

    try {
      // 1. Add Capik account (Developer)
      const capikHash = await hashPassword('@Capik190989');
      const { error: capikError } = await supabase
        .from('users')
        .upsert({
          id: '00000000-0000-0000-0000-000000000009',
          name: 'Capik',
          phone: '089675669989',
          address: 'Wangon Mas',
          role: 'developer',
          password_hash: capikHash,
          is_active: true
        });

      if (capikError) throw capikError;

      // 2. Update Mbak Pia account (Manager)
      const piaHash = await hashPassword('piaton12345');
      const { error: piaError } = await supabase
        .from('users')
        .upsert({
          id: '00000000-0000-0000-0000-000000000010',
          name: 'Mbak Pia',
          phone: '087733662600',
          address: 'Wangon Mas',
          role: 'manager',
          password_hash: piaHash,
          is_active: true
        });

      if (piaError) throw piaError;

      // 3. Add Noeng account (Staff)
      const noengHash = await hashPassword('noeng12345');
      const { error: noengError } = await supabase
        .from('users')
        .upsert({
          id: '00000000-0000-0000-0000-000000000011',
          name: 'Noeng',
          phone: '08123456789',
          address: 'sungi',
          role: 'staff',
          branch_id: '00000000-0000-0000-0000-000000000001',
          password_hash: noengHash,
          is_active: true
        });

      if (noengError) throw noengError;

      // Verify Capik account
      const { data: verify } = await supabase.from('users').select('name, role').eq('name', 'Capik').single();
      console.log('Verified user:', verify);

      // 3. Add default branches if not exist
      await supabase.from('branches').upsert([
        { id: '00000000-0000-0000-0000-000000000001', name: 'Warung Gadis Pusat', address: 'Bendungan', is_active: true },
        { id: '00000000-0000-0000-0000-000000000002', name: 'Warung Gadis Cabang 2', address: 'Cabang 2', is_active: true }
      ]);

      setStatus('success');
      setMessage('✅ Setup Berhasil! Akun Capik dan Mama Pia sekarang bisa digunakan untuk login.');
    } catch (error: any) {
      console.error(error);
      setStatus('error');
      setMessage(`❌ Error: ${error.message || 'Gagal menjalankan setup'}`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold mb-4 text-center">Setup Database Warung-Gadis</h1>
        <p className="text-gray-600 mb-6 text-center">
          Halaman ini akan menambahkan akun Capik dan Mama Pia ke database Supabase Anda.
        </p>

        {status === 'idle' && (
          <button
            onClick={runSetup}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition"
          >
            Jalankan Setup Sekarang
          </button>
        )}

        {status === 'loading' && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-blue-600">{message}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            <p className="font-bold">Berhasil!</p>
            <p>{message}</p>
            <button
              onClick={() => window.location.href = '/login'}
              className="mt-4 w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 transition"
            >
              Pergi ke Halaman Login
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <p className="font-bold">Gagal!</p>
            <p>{message}</p>
            <button
              onClick={runSetup}
              className="mt-4 w-full bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700 transition"
            >
              Coba Lagi
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SetupDatabase;
