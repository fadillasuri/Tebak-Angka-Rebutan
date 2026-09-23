const net = require("net");

const PORT = 5001;
let clients = new Map(); // {socket: nickname}
let scores = {}; // {nickname: jumlah_kemenangan}

let secretNumber = 0;
let roundActive = false;
let roundCount = 0;
const MAX_ROUNDS = 5;

// ANSI Colors untuk Dashboard Server
const c = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  red: "\x1b[31m",
  magenta: "\x1b[35m",
};

function renderServerDashboard(eventLog = "") {
  console.clear();
  console.log(
    `${c.cyan}${c.bright}====================================================`,
  );
  console.log(`        NODE.JS MULTI-CLIENT GAME SERVER          `);
  console.log(`====================================================${c.reset}`);
  console.log(` Status Socket   : ${c.green}ONLINE (Port: ${PORT})${c.reset}`);
  console.log(
    ` Total Client    : ${c.yellow}${clients.size} Pemain Terhubung${c.reset}`,
  );
  console.log(
    ` Status Ronde    : ${roundActive ? c.green + "BERLANGSUNG (Aktif)" : c.yellow + "JEDA / ANTARA RONDE"}${c.reset}`,
  );
  console.log(` Progress Sesi   : Ronde ${roundCount} dari ${MAX_ROUNDS}`);
  console.log(
    `${c.cyan}----------------------------------------------------${c.reset}`,
  );

  // --- SECTION TERPISAH: KONTROL & ANGKA RAHASIA ---
  console.log(` ${c.bright} INFORMASI RAHASIA SERVER (DEBUG):${c.reset}`);
  console.log(
    `  - Angka Rahasia Ronde Ini : ${c.yellow}${c.bright}[ ${roundActive ? secretNumber : "MENUNGGU..."} ]${c.reset}`,
  );
  console.log(
    `${c.cyan}----------------------------------------------------${c.reset}`,
  );

  // --- SECTION TERPISAH: TABEL SKOR ---
  console.log(` ${c.bright}TABEL SKOR SEMENTARA:${c.reset}`);
  let entries = Object.entries(scores);
  if (entries.length === 0) {
    console.log(`  (Belum ada skor tercatat)`);
  } else {
    entries.forEach(([nick, pts]) => {
      console.log(
        `  - ${nick.padEnd(12, " ")} : ${c.green}${pts} Poin${c.reset}`,
      );
    });
  }

  console.log(
    `${c.cyan}----------------------------------------------------${c.reset}`,
  );

  // --- SECTION TERPISAH: LOG AKTIVITAS ---
  console.log(` ${c.bright} LOG AKTIVITAS TERAKHIR:${c.reset}`);
  console.log(`  > ${eventLog || "(Menunggu aktivitas permainan...)"}`);
  console.log(
    `${c.cyan}====================================================${c.reset}`,
  );
}

function broadcast(message, excludeSocket = null) {
  for (let [sock] of clients) {
    if (sock !== excludeSocket) {
      sock.write(message);
    }
  }
}

function startNewRound() {
  if (roundCount >= MAX_ROUNDS) {
    endGameSession();
    return;
  }

  roundCount++;
  // Generate angka rahasia secara random (1 - 50)
  secretNumber = Math.floor(Math.random() * 50) + 1;
  roundActive = true;

  let logText = `Ronde ${roundCount} dimulai. Berhasil mengenerate angka rahasia baru.`;
  renderServerDashboard(logText);

  broadcast(
    `\n========================================\n` +
      `RONDE ${roundCount} dari ${MAX_ROUNDS} DIMULAI! Tebak angka 1 - 50\n` +
      `========================================\n`,
  );
}

function endGameSession() {
  roundActive = false;
  let leaderboardEntries = Object.entries(scores);
  let finalMsg =
    `\n========================================\n` +
    `       PERMAINAN SELESAI (GAME OVER)    \n` +
    `========================================\n`;

  if (leaderboardEntries.length > 0) {
    leaderboardEntries.sort((a, b) => b[1] - a[1]);
    let winner = leaderboardEntries[0];

    finalMsg +=
      `PEMENANG UTAMA: ${winner[1] > 0 ? winner[0] + " dengan " + winner[1] + " poin!" : "Tidak ada pemenang."}\n\n` +
      `Skor Akhir Keseluruhan:\n` +
      leaderboardEntries
        .map(([nick, scr]) => `- ${nick}: ${scr} kemenangan`)
        .join("\n") +
      `\n========================================\n`;
  } else {
    finalMsg += `Tidak ada peserta yang mencetak skor.\n========================================\n`;
  }

  renderServerDashboard(
    `Sesi permainan telah berakhir (${MAX_ROUNDS} ronde selesai).`,
  );
  broadcast(finalMsg);

  setTimeout(() => {
    roundCount = 0;
    scores = {};
    startNewRound();
  }, 5000);
}

const server = net.createServer((socket) => {
  let nickname = "";

  socket.write("Masukkan nickname Anda: ");

  socket.on("data", (data) => {
    let msg = data.toString().trim();

    if (!nickname) {
      nickname = msg || `User-${socket.remotePort}`;
      clients.set(socket, nickname);
      renderServerDashboard(`${nickname} baru saja terhubung ke server.`);

      broadcast(
        `[*] ${nickname} telah bergabung ke dalam permainan.\n`,
        socket,
      );

      socket.write(
        `\n========================================\n` +
          `       SELAMAT DATANG DI PERMAINAN      \n` +
          `========================================\n` +
          `ATURAN PERMAINAN:\n` +
          `1. Rentang Angka : 1 sampai 50 (Random)\n` +
          `2. Sistem Game   : Rebutan tercepat antar client\n` +
          `3. Total Ronde   : ${MAX_ROUNDS} Ronde\n` +
          `4. Cara Keluar   : Ketik 'exit'\n` +
          `========================================\n` +
          `[SERVER] Saat ini permainan berada di Ronde ${roundCount}. Silakan ketik tebakan Anda!\n\n`,
      );
      return;
    }

    if (msg.toLowerCase() === "exit") {
      socket.end();
      return;
    }

    let guess = parseInt(msg);
    if (isNaN(guess)) {
      socket.write(
        '[SERVER] Masukkan format angka yang valid (1-50) atau ketik "exit".\n',
      );
      return;
    }

    if (!roundActive) {
      socket.write(
        "[SERVER] Ronde sedang tidak aktif atau permainan selesai. Tunggu sebentar...\n",
      );
    } else if (guess === secretNumber) {
      roundActive = false;

      scores[nickname] = (scores[nickname] || 0) + 1;
      let leaderboardStr = Object.entries(scores)
        .map(([nick, scr]) => `${nick}: ${scr}`)
        .join(", ");

      let winMsg =
        `\n*** ${nickname} MENANG RONDE ${roundCount}! Angka benar: ${secretNumber} ***\n` +
        `Skor sementara -> ${leaderboardStr}\n`;

      renderServerDashboard(
        `${nickname} berhasil menebak angka ${secretNumber} dengan benar di Ronde ${roundCount}!`,
      );
      broadcast(winMsg);

      setTimeout(() => {
        startNewRound();
      }, 3000);
    } else {
      if (guess < secretNumber) {
        socket.write(
          `[SERVER] Tebakan (${guess}) terlalu KECIL. Naikkan angka!\n`,
        );
      } else {
        socket.write(
          `[SERVER] Tebakan (${guess}) terlalu BESAR. Turunkan angka!\n`,
        );
      }
    }
  });

  socket.on("close", () => {
    if (clients.has(socket)) {
      let nick = clients.get(socket);
      clients.delete(socket);
      renderServerDashboard(`Koneksi terputus dari ${nick}.`);
      broadcast(`[*] ${nick} telah meninggalkan permainan.\n`);
    }
  });

  socket.on("error", () => {});
});

server.listen(PORT, () => {
  renderServerDashboard(`Server berhasil dijalankan pada port ${PORT}.`);
  startNewRound();
});
