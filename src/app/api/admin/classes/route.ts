import { NextRequest, NextResponse } from 'next/server';
import { getAllDepartments, createDepartment, batchImportDepartments, getAllClasses, createClass, batchImportClasses, getTeacherList, assignTeacherToClass, removeTeacherFromClass } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const type = req.nextUrl.searchParams.get('type');
    if (type === 'departments') return NextResponse.json(getAllDepartments());
    if (type === 'teachers') return NextResponse.json(getTeacherList());
    return NextResponse.json(getAllClasses());
  } catch (error) {
    return NextResponse.json({ error: '获取数据失败' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'createDepartment') {
      return NextResponse.json(createDepartment(body.name), { status: 201 });
    }
    if (action === 'batchImportDepartments') {
      return NextResponse.json(batchImportDepartments(body.names));
    }
    if (action === 'createClass') {
      return NextResponse.json(createClass({ name: body.name, grade: body.grade, department_id: body.department_id }), { status: 201 });
    }
    if (action === 'batchImportClasses') {
      return NextResponse.json(batchImportClasses(body.classes));
    }
    if (action === 'assignTeacher') {
      assignTeacherToClass(body.teacher_id, body.class_id);
      return NextResponse.json({ message: '教师已分配' });
    }
    if (action === 'removeTeacher') {
      removeTeacherFromClass(body.teacher_id, body.class_id);
      return NextResponse.json({ message: '已移除教师' });
    }

    return NextResponse.json({ error: '未知操作' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: '操作失败' }, { status: 500 });
  }
}
