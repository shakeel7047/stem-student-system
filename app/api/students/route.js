import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET: Sabhi students aur stats fetch karna
export async function GET() {
  try {
    const [rows] = await pool.query('SELECT * FROM students ORDER BY id DESC');
    
    const [totalCountRows] = await pool.query('SELECT COUNT(*) as total FROM students');
    const [activeCountRows] = await pool.query("SELECT COUNT(*) as active FROM students WHERE status = 'Active'");
    const [frozenCountRows] = await pool.query("SELECT COUNT(*) as frozen FROM students WHERE status = 'Frozen'");
    const [maleCountRows] = await pool.query("SELECT COUNT(*) as male FROM students WHERE gender = 'Male'");
    const [femaleCountRows] = await pool.query("SELECT COUNT(*) as female FROM students WHERE gender = 'Female'");

    return NextResponse.json({
      students: rows,
      stats: {
        total: totalCountRows?.[0]?.total || 0,
        active: activeCountRows?.[0]?.active || 0,
        frozen: frozenCountRows?.[0]?.frozen || 0,
        male: maleCountRows?.[0]?.male || 0,
        female: femaleCountRows?.[0]?.female || 0,
      }
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Database error occurred' }, { status: 500 });
  }
}

// POST: Naya student add karna
export async function POST(req) {
  try {
    const body = await req.json();
    const { reg_no, student_name, father_name, contact_1, contact_2, class: studentClass, section, gender, house, status } = body;

    const query = `
      INSERT INTO students (reg_no, student_name, father_name, contact_1, contact_2, class, section, gender, house, status) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const values = [
      reg_no, 
      student_name, 
      father_name, 
      contact_1 || '', 
      contact_2 || '', 
      studentClass, 
      section, 
      gender, 
      house, 
      status || 'Active'
    ];

    const [result] = await pool.query(query, values);

    return NextResponse.json({ success: true, id: result.insertId });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Failed to insert student' }, { status: 500 });
  }
}

// PUT: Student record update karna
export async function PUT(req) {
  try {
    const body = await req.json();
    const { id, reg_no, student_name, father_name, contact_1, contact_2, class: studentClass, section, gender, house, status } = body;

    if (!id) {
      return NextResponse.json({ error: 'Student ID is required for update' }, { status: 400 });
    }

    const query = `
      UPDATE students 
      SET reg_no = ?, student_name = ?, father_name = ?, contact_1 = ?, contact_2 = ?, class = ?, section = ?, gender = ?, house = ?, status = ? 
      WHERE id = ?
    `;
    
    const values = [
      reg_no, 
      student_name, 
      father_name, 
      contact_1 || '', 
      contact_2 || '', 
      studentClass, 
      section, 
      gender, 
      house, 
      status || 'Active', 
      id
    ];

    await pool.query(query, values);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Failed to update student' }, { status: 500 });
  }
}

// DELETE: Student record delete karna
export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 });
    }

    await pool.query('DELETE FROM students WHERE id = ?', [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Failed to delete student' }, { status: 500 });
  }
}