const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const app = express();
const PORT = 3000;

const SUPABASE_URL = 'https://wbivcaastywioldxvbjc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_zeZRYYUREQcJyUUsqK-4tg_nmJ8zNuH';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

app.use(express.static('public'));

app.get('/api/events', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('tasks')
            .select('*');

        if (error) throw error;

        const events = data.map(item => ({
            title: `[${item.owner}] ${item.title}`,
            start: item.due_date,
            allDay: true,
            extendedProps: { owner: item.owner },
            color: getColorByOwner(item.owner)
        }));

        res.json(events);
    } catch (err) {
        console.error('데이터 가져오기 실패:', err);
        res.json([]);
    }
});

function getColorByOwner(owner) {
    const colors = { '문창수': '#f87171', '이승직': '#60a5fa', '이도협': '#34d399', '윤진성': '#fbbf24', '김성학': '#a78bfa' };
    return colors[owner] || '#94a3b8';
}

app.listen(PORT, () => {
    console.log('🚀 서버 가동 중: http://localhost:3000');
});