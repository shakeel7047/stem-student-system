import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET: Sabhi students aur stats fetch karna
export async function GET() {
  try {
    const studentsResult = await pool.query('SELECT * FROM students ORDER BY id DESC');
    const students = studentsResult.rows;
    
    const totalResult = await pool.query('SELECT COUNT(*) as total FROM students');
    const activeResult = await pool.query("SELECT COUNT(*) as active FROM students WHERE status = 'Active'");
    const frozenResult = await pool.query("SELECT COUNT(*) as frozen FROM students WHERE status = 'Frozen'");
const maleResult = await pool.query("SELECT COUNT(*) as male FROM students WHERE LOWER(TRIM(gender)) = 'male'");
    const femaleResult = await pool.query("SELECT COUNT(*) as female FROM students WHERE LOWER(TRIM(gender)) = 'female'");
    return NextResponse.json({
      students: students,
      stats: {
        total: parseInt(totalResult.rows?.[0]?.total || 0),
        active: parseInt(activeResult.rows?.[0]?.active || 0),
        frozen: parseInt(frozenResult.rows?.[0]?.frozen || 0),
        male: parseInt(maleResult.rows?.[0]?.male || 0),
        female: parseInt(femaleResult.rows?.[0]?.female || 0),
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
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id;
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

    const result = await pool.query(query, values);

    return NextResponse.json({ success: true, id: result.rows[0].id });
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
      SET reg_no = $1, student_name = $2, father_name = $3, contact_1 = $4, contact_2 = $5, class = $6, section = $7, gender = $8, house = $9, status = $10 
      WHERE id = $11
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

    await pool.query('DELETE FROM students WHERE id = $1', [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Failed to delete student' }, { status: 500 });
  }
}