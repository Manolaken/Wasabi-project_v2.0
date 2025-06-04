import { pool } from '@/app/api/lib/db';
import { NextResponse } from 'next/server';
// Next response sirve para enviar respuestas a las peticiones desde una API

export async function GET() {
  try {
    const [rows] = await pool.query('SELECT * FROM Departamento');
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Error fetching users' },
      { status: 500 }
    );
  }
} 