import React, { useState } from 'react';
import { supabase } from '../config/supabase';

const SetupDatabase = () => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const runSetup = async () => {
    setStatus('loading');
    setMessage('Menjalankan setup database...');

    try {
      // 1. Add Capik account
      const capikHash = '264e5b43c54210226f70541ac5482895bf82559bf1c41b2008fa249831ffc508';
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

      // 2. Update Mama Pia account
      const mamaHash = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9';
      const { error: mamaError } = await supabase
        .from('users')
        .upsert({
          id: '00000000-0000-0000-0000-000000000010',
          name: 'Mama Pia',
          phone: '087733662600',
          address: 'Bendungan',
          role: 'manager',
          branch_id: '00000000-0000-0000-0000-000000000001',
          password_hash: mamaHash,
          is_active: true
        });

      if (mamaError) throw mamaError;

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
