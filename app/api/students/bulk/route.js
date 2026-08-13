import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request) {
    try {
        const students = await request.json();
        
        if (!Array.isArray(students) || students.length === 0) {
            return NextResponse.json({ error: 'Invalid data format or empty file.' }, { status: 400 });
        }

        // Loop chalakar ek ek karke insert ya update karein (PostgreSQL syntax ke sath)
        for (const s of students) {
            const regNo = s.reg_no || s['Reg No'] || s['Registration No'];
            const studentName = s.student_name || s['Student Name'] || s['Name'];
            const fatherName = s.father_name || s['Father Name'];
            const cls = s.class || s['Class'];
            const section = s.section || s['Section'];
            const gender = s.gender || s['Gender'];
            const house = s.house || s['House'];

            if (regNo && studentName) {
                const query = `
                    INSERT INTO students (reg_no, student_name, father_name, class, section, gender, house, status) 
                    VALUES ($1, $2, $3, $4, $5, $6, $7, 'Active')
                    ON CONFLICT (reg_no) DO UPDATE 
                    SET student_name = EXCLUDED.student_name, 
                        father_name = EXCLUDED.father_name, 
                        class = EXCLUDED.class, 
                        section = EXCLUDED.section, 
                        gender = EXCLUDED.gender, 
                        house = EXCLUDED.house;
                `;
                
                const values = [
                    regNo, 
                    studentName, 
                    fatherName || '', 
                    cls || '', 
                    section || '', 
                    gender || 'Male', 
                    house || ''
                ];

                await pool.query(query, values);
            }
        }

        return NextResponse.json({ success: true, message: 'Bulk data imported successfully!' });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}