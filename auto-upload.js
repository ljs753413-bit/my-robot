const fs = require('fs');
const chokidar = require('chokidar');
const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://wbivcaastywioldxvbjc.supabase.co', 'sb_secret_zYpl4XrkkPEf9nU7rIaQaw_NHbSjBRO');

console.log('🚀 날짜 변환 기능이 포함된 자동 업로드 시스템 가동 중...');

chokidar.watch('./excel-inbox').on('add', (path) => {
    if (!path.endsWith('.csv') && !path.endsWith('.xlsx')) return;
    
    console.log(`파일 감지됨: ${path}`);
    const workbook = xlsx.readFile(path);
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
    
    data.forEach(async (row) => {
        // 1. 제목 처리
        const rawTitle = row['주제'] || '';
        const title = rawTitle.toString().split('/')[0].trim();

        // 2. 엑셀 숫자 날짜를 ISO 날짜 형식으로 변환 (핵심!)
        let rawDate = row['기한'];
        let formattedDate;

        if (typeof rawDate === 'number') {
            // 엑셀 날짜 숫자 -> 자바스크립트 날짜 객체
            const dateObj = xlsx.SSF.parse_date_code(rawDate);
            formattedDate = `${dateObj.y}-${String(dateObj.m).padStart(2, '0')}-${String(dateObj.d).padStart(2, '0')}`;
        } else {
            formattedDate = rawDate; // 이미 날짜 문자열인 경우 그대로 사용
        }

        const taskData = {
            title: title,
            due_date: formattedDate,
            owner: row['담당자']
        };

        const { error } = await supabase.from('tasks').insert([taskData]);
        if (error) console.error('입력 오류:', error);
        else console.log(`성공: [${title}] 날짜(${formattedDate}) 입력 완료`);
    });
});