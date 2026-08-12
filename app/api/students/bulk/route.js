import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request) {
    try {
        const students = await request.json();
        
        if (!Array.isArray(students) || students.length === 0) {
            return NextResponse.json({ error: 'Invalid data format or empty file.' }, { status: 400 });
        }

        // Loop chalakar ek ek karke ya bulk mein insert karein
        for (const s of students) {
            // CSV columns ke naam match hone chahiye (reg_no, student_name, father_name, class, section, gender, house)
            const regNo = s.reg_no || s['Reg No'] || s['Registration No'];
            const studentName = s.student_name || s['Student Name'] || s['Name'];
            const fatherName = s.father_name || s['Father Name'];
            const cls = s.class || s['Class'];
            const section = s.section || s['Section'];
            const gender = s.gender || s['Gender'];
            const house = s.house || s['House'];

            if (regNo && studentName) {
                await pool.query(
                    `INSERT INTO students (reg_no, student_name, father_name, class, section, gender, house, status) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, 'Active')
                     ON DUPLICATE KEY UPDATE 
                     student_name = VALUES(student_name), father_name = VALUES(father_name), 
                     class = VALUES(class), section = VALUES(section), gender = VALUES(gender), house = VALUES(house)`,
                    [regNo, studentName, fatherName || '', cls || '', section || '', gender || 'Male', house || '']
                );
            }
        }

        return NextResponse.json({ success: true, message: 'Bulk data imported successfully!' });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}