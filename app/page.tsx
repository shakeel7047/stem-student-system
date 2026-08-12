'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Upload, Download, Moon, Sun, Plus, Edit, Trash2, Snowflake } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { applyPlugin } from 'jspdf-autotable';

// Apply the autotable plugin to the jsPDF instance explicitly
applyPlugin(jsPDF);

interface Student {
  id: number;
  reg_no: string;
  student_name: string;
  father_name: string;
  contact_1: string;
  contact_2: string;
  class: string;
  section: string;
  gender: string;
  house: string;
  status: string;
}

interface Stats {
  total: number;
  active: number;
  frozen: number;
  male: number;
  female: number;
}

export default function StudentDashboard() {
  const [darkMode, setDarkMode] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0, frozen: 0, male: 0, female: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedClassFilter, setSelectedClassFilter] = useState('ALL');
  const [selectedSectionFilter, setSelectedSectionFilter] = useState('ALL');
  const [selectedHouseFilter, setSelectedHouseFilter] = useState('ALL');

  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ 
    reg_no: '', student_name: '', father_name: '', contact_1: '', contact_2: '', class: 'PG', section: 'A', gender: 'Male', house: 'Lion', status: 'Active' 
  });
  const [editId, setEditId] = useState<number | null>(null);

  const houseOptions = ['Lion', 'Falcon', 'Knight', 'Titans'];
  const classOptions = ['PG', 'Nursery', 'KG', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

  const sectionOptions = useMemo(() => {
    const sections = new Set(students.map(s => s.section).filter(Boolean));
    return Array.from(sections).sort();
  }, [students]);

  const classStats = useMemo(() => {
    const map: Record<string, { total: number; male: number; female: number }> = {};
    classOptions.forEach(cls => {
      map[cls] = { total: 0, male: 0, female: 0 };
    });

    students.forEach(s => {
      if (!map[s.class]) {
        map[s.class] = { total: 0, male: 0, female: 0 };
      }
      map[s.class].total += 1;
      if (s.gender?.toLowerCase() === 'male') {
        map[s.class].male += 1;
      } else if (s.gender?.toLowerCase() === 'female') {
        map[s.class].female += 1;
      }
    });

    return classOptions.map(cls => ({
      class: cls,
      ...map[cls]
    })).filter(item => item.total > 0);
  }, [students, classOptions]);

  const maxClassStrength = useMemo(() => {
    if (classStats.length === 0) return 10;
    const max = Math.max(...classStats.map(item => item.total), 10);
    return Math.ceil(max / 10) * 10;
  }, [classStats]);

  const maxGenderCount = useMemo(() => {
    const males = students.filter(s => s.gender?.toLowerCase() === 'male').length;
    const females = students.filter(s => s.gender?.toLowerCase() === 'female').length;
    const max = Math.max(males, females, 10);
    return Math.ceil(max / 10) * 10;
  }, [students]);

  const maleCount = useMemo(() => students.filter(s => s.gender?.toLowerCase() === 'male').length, [students]);
  const femaleCount = useMemo(() => students.filter(s => s.gender?.toLowerCase() === 'female').length, [students]);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/students');
      const data = await res.json();
      if (data && Array.isArray(data.students)) {
        setStudents(data.students);
        setStats(data.stats);
      } else if (Array.isArray(data)) {
        setStudents(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { 
    fetchStudents();
  }, [fetchStudents]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchesClass = selectedClassFilter === 'ALL' || s.class === selectedClassFilter;
      const matchesSection = selectedSectionFilter === 'ALL' || s.section === selectedSectionFilter;
      const matchesHouse = selectedHouseFilter === 'ALL' || s.house === selectedHouseFilter;
      
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch = !query || Object.values(s).some(val => 
        val !== null && val !== undefined && String(val).toLowerCase().includes(query)
      );

      return matchesClass && matchesSection && matchesHouse && matchesSearch;
    });
  }, [students, selectedClassFilter, selectedSectionFilter, selectedHouseFilter, searchQuery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = editId ? { ...formData, id: editId } : formData;
      const res = await fetch('/api/students', {
        method: editId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const result = await res.json();

      if (res.ok) {
        setIsModalOpen(false);
        setFormData({ reg_no: '', student_name: '', father_name: '', contact_1: '', contact_2: '', class: 'PG', section: 'A', gender: 'Male', house: 'Lion', status: 'Active' });
        setEditId(null);
        fetchStudents();
      } else {
        alert(`Error: ${result.error || 'Failed to save record.'}`);
      }
    } catch (error: unknown) {
      const err = error as Error;
      console.error('Error saving student:', err);
      alert(`Network or Server Error: ${err.message}`);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this record?')) {
      await fetch(`/api/students?id=${id}`, { method: 'DELETE' });
      fetchStudents();
    }
  };

  const handleToggleFreeze = async (student: Student) => {
    await fetch('/api/students', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...student, status: student.status === 'Active' ? 'Frozen' : 'Active' })
    });
    fetchStudents();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const binaryStr = evt.target?.result;
      const workbook = XLSX.read(binaryStr, { type: 'binary' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json<Record<string, string>>(sheet);
      
      const validatedData = data.filter(row => classOptions.includes(row.class));
      if (validatedData.length < data.length) alert(`Warning: ${data.length - validatedData.length} records ignored (invalid class).`);
      
      await fetch('/api/students/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(validatedData) });
      alert('Import Successful!');
      fetchStudents();
    };
    reader.readAsBinaryString(file);
  };

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(filteredStudents);
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    
    let fileName = "STEM_Students_Report.xlsx";
    if (selectedClassFilter !== 'ALL') fileName = `STEM_Class_${selectedClassFilter}_Report.xlsx`;
    if (selectedSectionFilter !== 'ALL') fileName = `STEM_Class_${selectedClassFilter}_Sec_${selectedSectionFilter}_Report.xlsx`;
    
    XLSX.writeFile(wb, fileName);
  };

  const exportToPDF = async () => {
    if (!filteredStudents || filteredStudents.length === 0) {
      alert('No student data available to export. Please ensure data has been loaded.');
      return;
    }

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let isPDFGenerated = false;

      const generatePDF = (imgData?: string) => {
        if (isPDFGenerated) return;
        isPDFGenerated = true;

        if (imgData) {
          try {
            doc.addImage(imgData, 'PNG', 14, 10, 16, 16);
          } catch (e) {
            console.error("Image add error:", e);
          }
        }

        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("The STEM Schools & College System", imgData ? 34 : 14, 18);

        let subtitleText = "Comprehensive Student List Report";
        if (selectedClassFilter !== 'ALL') {
          subtitleText = `Student List - Class ${selectedClassFilter}`;
          if (selectedSectionFilter !== 'ALL') subtitleText += ` (Sec: ${selectedSectionFilter})`;
        }
        if (selectedHouseFilter !== 'ALL') {
          subtitleText += ` - ${selectedHouseFilter} House`;
        }
        
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(subtitleText, pageWidth / 2, 28, { align: 'center' });

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100);
        const currentDateTime = new Date().toLocaleString();
        doc.text(`Print Date/Time: ${currentDateTime}`, pageWidth / 2, 34, { align: 'center' });
        doc.setTextColor(0);

        const tableData = filteredStudents.map(s => [
          s.reg_no || '', 
          s.student_name || '', 
          s.father_name || '', 
          s.contact_1 || '',
          s.contact_2 || '',
          `${s.class || ''}-${s.section || ''}`, 
          s.gender || '', 
          s.house || '', 
          s.status || ''
        ]);

        const options = {
          head: [["Reg No", "Name", "Father", "Contact #1", "Contact #2", "Class", "Gender", "House", "Status"]],
          body: tableData,
          startY: 40,
          theme: 'striped',
          headStyles: { fillColor: [79, 70, 229] },
          styles: { fontSize: 9, cellPadding: 3 },
          didDrawPage: () => {
            doc.setFontSize(8);
            doc.setFont("helvetica", "italic");
            doc.text(
              "All rights reserved with ICONtechonologies-2026", 
              pageWidth - 14, 
              doc.internal.pageSize.getHeight() - 10, 
              { align: 'right' }
            );
          }
        };

        if (typeof (doc as any).autoTable === 'function') {
          (doc as any).autoTable(options);
        } else {
          console.error("autoTable plugin is not attached to jsPDF instance.");
        }

        const saveFileName = selectedClassFilter !== 'ALL' ? `Student_List_Class_${selectedClassFilter}.pdf` : "Student_List_Report.pdf";
        doc.save(saveFileName);
      };

      const timeoutId = setTimeout(() => {
        generatePDF(undefined);
      }, 1500);

      const img = new Image();
      img.src = '/logo.png'; 
      img.onload = () => {
        clearTimeout(timeoutId);
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            generatePDF(canvas.toDataURL('image/png'));
          } else {
            generatePDF(undefined);
          }
        } catch {
          generatePDF(undefined);
        }
      };
      img.onerror = () => {
        clearTimeout(timeoutId);
        generatePDF(undefined);
      };

    } catch (err) {
      console.error("PDF generation error:", err);
      alert("Failed to generate PDF. Check console for details.");
    }
  };

  return (
    <div className={`${darkMode ? 'dark bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'} min-h-screen transition-colors duration-300 font-sans`}>
      <header className="bg-indigo-600 dark:bg-indigo-900 text-white shadow-md py-4 px-6 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <img 
            src="/logo.png" 
            alt="School Logo" 
            className="w-10 h-10 object-contain bg-white rounded-full p-1 shadow"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <div>
            <h1 className="text-xl md:text-2xl font-bold">The STEM Schools & College System</h1>
            <p className="text-xs text-indigo-200">Student Management Information System</p>
          </div>
        </div>
        <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-full bg-indigo-700">{darkMode ? <Sun size={20} /> : <Moon size={20} />}</button>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow border border-indigo-100 dark:border-gray-700 flex flex-col justify-between items-center text-center">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Students</p>
              <h3 className="text-3xl font-bold text-indigo-600">{stats.total || students.length}</h3>
            </div>
            <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-700 w-full flex justify-center items-center gap-3 text-xs font-medium text-gray-600 dark:text-gray-300">
              <span>Male: <strong className="text-indigo-600 dark:text-indigo-400">{stats.male ?? maleCount}</strong></span>
              <span>|</span>
              <span>Female: <strong className="text-pink-600 dark:text-pink-400">{stats.female ?? femaleCount}</strong></span>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow border border-indigo-100 dark:border-gray-700 flex flex-col justify-center items-center text-center">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Active</p>
              <h3 className="text-3xl font-bold text-green-600">{stats.active || students.filter(s => s.status === 'Active').length}</h3>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow border border-indigo-100 dark:border-gray-700 flex flex-col justify-center items-center text-center">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Frozen</p>
              <h3 className="text-3xl font-bold text-amber-500">{stats.frozen || students.filter(s => s.status === 'Frozen').length}</h3>
            </div>
          </div>

          <button onClick={() => { setEditId(null); setFormData({ reg_no: '', student_name: '', father_name: '', contact_1: '', contact_2: '', class: 'PG', section: 'A', gender: 'Male', house: 'Lion', status: 'Active' }); setIsModalOpen(true); }} className="bg-indigo-600 text-white p-5 rounded-xl shadow flex items-center justify-center gap-2 font-semibold hover:bg-indigo-700 transition text-center">
            <Plus size={20} /> Add New Student
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow border border-indigo-100 dark:border-gray-700 flex flex-col justify-between">
            <h3 className="text-center font-bold text-gray-800 dark:text-gray-200 text-base mb-4 tracking-wide uppercase border-b border-gray-100 dark:border-gray-700 pb-2">
              Class-wise Strength Chart
            </h3>

            {classStats.length === 0 ? (
              <div className="text-center py-20 text-sm text-gray-400">No data available for class strength chart</div>
            ) : (
              <div className="relative h-64 w-full flex items-end pl-8 pr-2 pt-6 pb-2">
                <div className="absolute inset-0 left-8 right-2 flex flex-col justify-between pointer-events-none">
                  {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                    const val = Math.round(maxClassStrength * (1 - ratio));
                    return (
                      <div key={i} className="w-full border-b border-gray-200 dark:border-gray-700/60 relative flex items-center">
                        <span className="absolute -left-8 text-[10px] text-gray-500 dark:text-gray-400 w-6 text-right">{val}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="w-full h-full flex items-end justify-around z-10 gap-1 md:gap-2">
                  {classStats.map((item) => {
                    const heightPercent = (item.total / maxClassStrength) * 100;
                    return (
                      <div key={item.class} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                        <div className="absolute -top-8 bg-gray-900 text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-30">
                          Class {item.class}: {item.total}
                        </div>
                        <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-300 mb-1">{item.total > 0 ? item.total : ''}</span>
                        <div 
                          style={{ height: `${Math.max(heightPercent, 4)}%` }} 
                          className="w-full max-w-[32px] bg-indigo-600 dark:bg-indigo-500 rounded-t transition-all duration-300 hover:bg-indigo-700"
                        ></div>
                        <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300 mt-2 truncate w-full text-center">{item.class}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow border border-indigo-100 dark:border-gray-700 flex flex-col justify-between">
            <h3 className="text-center font-bold text-gray-800 dark:text-gray-200 text-base mb-4 tracking-wide uppercase border-b border-gray-100 dark:border-gray-700 pb-2">
              Gender Distribution Chart (Male vs Female)
            </h3>

            {students.length === 0 ? (
              <div className="text-center py-20 text-sm text-gray-400">No data available for gender chart</div>
            ) : (
              <div className="relative h-64 w-full flex items-end pl-8 pr-2 pt-6 pb-2">
                <div className="absolute inset-0 left-8 right-2 flex flex-col justify-between pointer-events-none">
                  {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                    const val = Math.round(maxGenderCount * (1 - ratio));
                    return (
                      <div key={i} className="w-full border-b border-gray-200 dark:border-gray-700/60 relative flex items-center">
                        <span className="absolute -left-8 text-[10px] text-gray-500 dark:text-gray-400 w-6 text-right">{val}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="w-full h-full flex items-end justify-around z-10 px-8 gap-8">
                  <div className="flex-1 max-w-[80px] flex flex-col items-center h-full justify-end group relative">
                    <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-300 mb-1">{maleCount}</span>
                    <div 
                      style={{ height: `${Math.max((maleCount / maxGenderCount) * 100, 4)}%` }} 
                      className="w-full bg-blue-500 rounded-t transition-all duration-300 hover:bg-blue-600"
                    ></div>
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-2">Male</span>
                  </div>

                  <div className="flex-1 max-w-[80px] flex flex-col items-center h-full justify-end group relative">
                    <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-300 mb-1">{femaleCount}</span>
                    <div 
                      style={{ height: `${Math.max((femaleCount / maxGenderCount) * 100, 4)}%` }} 
                      className="w-full bg-pink-500 rounded-t transition-all duration-300 hover:bg-pink-600"
                    ></div>
                    <span className="text-xs font-bold text-pink-600 dark:text-pink-400 mt-2">Female</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow flex flex-col xl:flex-row justify-between items-center gap-4 border border-indigo-100 dark:border-gray-700">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:flex gap-3 w-full xl:w-auto">
            <input 
              type="text" 
              placeholder="Search..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="w-full sm:w-48 p-2 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm" 
            />
            
            <select 
              value={selectedClassFilter} 
              onChange={(e) => setSelectedClassFilter(e.target.value)} 
              className="w-full sm:w-36 p-2 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm font-medium"
            >
              <option value="ALL">All Classes</option>
              {classOptions.map(c => (
                <option key={c} value={c} className="bg-white dark:bg-gray-700 dark:text-white">
                  Class {c}
                </option>
              ))}
            </select>

            <select 
              value={selectedSectionFilter} 
              onChange={(e) => setSelectedSectionFilter(e.target.value)} 
              className="w-full sm:w-36 p-2 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm font-medium"
            >
              <option value="ALL">All Sections</option>
              {sectionOptions.map(sec => (
                <option key={sec} value={sec} className="bg-white dark:bg-gray-700 dark:text-white">
                  Sec {sec}
                </option>
              ))}
            </select>

            <select 
              value={selectedHouseFilter} 
              onChange={(e) => setSelectedHouseFilter(e.target.value)} 
              className="w-full sm:w-36 p-2 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm font-medium"
            >
              <option value="ALL">All Houses</option>
              {houseOptions.map(h => (
                <option key={h} value={h} className="bg-white dark:bg-gray-700 dark:text-white">
                  {h} House
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-2 w-full xl:w-auto justify-end">
            <button 
              onClick={() => {
                const wb = XLSX.utils.book_new();
                const ws = XLSX.utils.json_to_sheet([{ reg_no: 'STEM001', student_name: 'Ahmed', father_name: 'Ali', contact_1: '03001234567', contact_2: '03007654321', class: 'PG', section: 'A', gender: 'Male', house: 'Lion' }]);
                XLSX.utils.book_append_sheet(wb, ws, "Sample");
                XLSX.writeFile(wb, "Sample_File.xlsx");
              }} 
              className="bg-gray-200 dark:bg-gray-700 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600 px-4 py-2 rounded-lg text-sm transition"
            >
              Sample File
            </button>
            <label className="cursor-pointer bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-4 py-2 rounded-lg text-sm border border-indigo-200 dark:border-indigo-800 flex items-center gap-2">
              <Upload size={16} /> Upload <input type="file" onChange={handleFileUpload} className="hidden" />
            </label>
            <button onClick={exportToExcel} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2"><Download size={16} /> Excel</button>
            <button onClick={exportToPDF} className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2"><Download size={16} /> PDF</button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-x-auto border border-indigo-100 dark:border-gray-700">
          <table className="w-full text-sm text-left">
            <thead className="bg-indigo-50 dark:bg-indigo-950 text-indigo-900 dark:text-indigo-200 uppercase text-xs">
              <tr>
                <th className="p-4">Reg No</th>
                <th className="p-4">Name</th>
                <th className="p-4">Father</th>
                <th className="p-4">Contact #1</th>
                <th className="p-4">Contact #2</th>
                <th className="p-4">Class</th>
                <th className="p-4">Gender</th>
                <th className="p-4">House</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 dark:text-white">
              {loading ? (
                <tr><td colSpan={10} className="p-6 text-center text-gray-500">Loading records...</td></tr>
              ) : filteredStudents.length === 0 ? (
                <tr><td colSpan={10} className="p-6 text-center text-gray-500">No student records found.</td></tr>
              ) : (
                filteredStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                    <td className="p-4 font-semibold">{s.reg_no}</td>
                    <td className="p-4">{s.student_name}</td>
                    <td className="p-4">{s.father_name}</td>
                    <td className="p-4">{s.contact_1}</td>
                    <td className="p-4">{s.contact_2}</td>
                    <td className="p-4">{s.class}-{s.section}</td>
                    <td className="p-4">{s.gender}</td>
                    <td className="p-4 font-medium text-indigo-600 dark:text-indigo-400">{s.house}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${s.status === 'Active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="p-4 text-center flex justify-center gap-2">
                      <button onClick={() => handleToggleFreeze(s)} title="Freeze / Unfreeze" className="text-gray-400 hover:text-amber-500 p-1"><Snowflake size={16} /></button>
                      <button onClick={() => { setEditId(s.id); setFormData({ reg_no: s.reg_no, student_name: s.student_name, father_name: s.father_name, contact_1: s.contact_1 || '', contact_2: s.contact_2 || '', class: s.class, section: s.section, gender: s.gender, house: s.house, status: s.status }); setIsModalOpen(true); }} title="Edit" className="text-indigo-600 dark:text-indigo-400 p-1"><Edit size={16} /></button>
                      <button onClick={() => handleDelete(s.id)} title="Delete" className="text-rose-600 p-1"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl w-full max-w-lg shadow-xl border border-indigo-100 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 text-indigo-600 dark:text-indigo-400">{editId ? 'Edit Student Record' : 'Add New Student'}</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400">Reg No</label>
                  <input type="text" placeholder="Reg No" required value={formData.reg_no} onChange={e => setFormData({...formData, reg_no: e.target.value})} className="w-full p-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400">Student Name</label>
                  <input type="text" placeholder="Student Name" required value={formData.student_name} onChange={e => setFormData({...formData, student_name: e.target.value})} className="w-full p-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400">Father Name</label>
                  <input type="text" placeholder="Father Name" required value={formData.father_name} onChange={e => setFormData({...formData, father_name: e.target.value})} className="w-full p-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400">Section</label>
                  <input type="text" placeholder="Section (e.g. A)" required value={formData.section} onChange={e => setFormData({...formData, section: e.target.value})} className="w-full p-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400">Contact #1</label>
                  <input type="text" placeholder="Contact #1" value={formData.contact_1} onChange={e => setFormData({...formData, contact_1: e.target.value})} className="w-full p-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400">Contact #2</label>
                  <input type="text" placeholder="Contact #2" value={formData.contact_2} onChange={e => setFormData({...formData, contact_2: e.target.value})} className="w-full p-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400">Class</label>
                  <select value={formData.class} onChange={e => setFormData({...formData, class: e.target.value})} className="w-full p-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm">
                    {classOptions.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400">Gender</label>
                  <select value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})} className="w-full p-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm">
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400">House</label>
                  <select value={formData.house} onChange={e => setFormData({...formData, house: e.target.value})} className="w-full p-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm">
                    {houseOptions.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 dark:text-white rounded-lg text-sm">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold">Save Record</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}