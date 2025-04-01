const express = require('express');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const path = require('path');
const app = express();

// Конфигурация
const PORT = 3000;
const DATA_FILE = 'data.json';
let data = { songs: [], assignments: {} };

// Инициализация данных
if (fs.existsSync(DATA_FILE)) {
  data = JSON.parse(fs.readFileSync(DATA_FILE));
}

// Middleware
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Роуты
app.get('/status', (req, res) => {
  res.json({
    count: data.songs.length,
    max: 10,
    ready: data.songs.length >= 10
  });
});

app.post('/submit', (req, res) => {
  const { song } = req.body;
  const token = req.cookies.token || Math.random().toString(36).slice(2, 11);
  
  // Проверки
  if (data.songs.length >= 10) return res.redirect('/?error=Прием песен завершен');
  if (data.songs.some(s => s.token === token)) return res.redirect('/?error=Вы уже участвуете');

  // Сохранение
  data.songs.push({ token, song });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data));
  res.cookie('token', token, { maxAge: 900000 }).redirect('/');
});

app.get('/result', (req, res) => {
  const token = req.cookies.token;
  const song = data.assignments[token];
  song ? res.send(`🎵 Ваша песня: ${song}`) : res.redirect('/?error=Результат еще не готов');
});

// Автоматическое распределение
setInterval(() => {
  if (data.songs.length >= 10 && Object.keys(data.assignments).length === 0) {
    const shuffled = shuffle([...data.songs]);
    data.assignments = {};
    data.songs.forEach((user, i) => {
      data.assignments[user.token] = shuffled[i].song;
    });
    fs.writeFileSync(DATA_FILE, JSON.stringify(data));
  }
}, 5000);

// Запуск сервера
app.listen(PORT, () => console.log(`Сервер запущен: http://localhost:${PORT}`));

// Алгоритм перемешивания
function shuffle(arr) {
  let result;
  do {
    result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
  } while (result.some((el, i) => el === arr[i]));
  return result;
}