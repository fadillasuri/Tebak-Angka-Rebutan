const net = require('net');
const readline = require('readline');

const PORT = 5001;
const HOST = '127.0.0.1';

// ANSI Colors untuk Tampilan Client
const c = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    cyan: "\x1b[36m",
    red: "\x1b[31m",
    magenta: "\x1b[35m"
};

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const client = new net.Socket();

function drawClientHeader() {
    console.clear();
    console.log(`${c.cyan}${c.bright}====================================================`);
    console.log(`          TEBAK ANGKA REBUTAN - CLIENT           `);
    console.log(`====================================================${c.reset}`);
    console.log(` Status Koneksi : ${c.green}Terhubung ke Server${c.reset}`);
    console.log(` Petunjuk       : Masukkan angka (1-50) atau 'exit'`);
    console.log(`${c.cyan}----------------------------------------------------${c.reset}\n`);
}

drawClientHeader();

client.connect(PORT, HOST, () => {
    // Koneksi aktif
});

client.on('data', (data) => {
    let msg = data.toString();
    
    // Memberikan format warna dinamis berdasarkan informasi server
    if (msg.includes('MENANG') || msg.includes('PEMENANG')) {
        console.log(`\n${c.green}${c.bright}${msg}${c.reset}`);
    } else if (msg.includes('terlalu KECIL') || msg.includes('terlalu BESAR')) {
        console.log(`${c.yellow}${msg.trim()}${c.reset}`);
    } else if (msg.includes('RONDE') || msg.includes('PERMAINAN SELESAI')) {
        console.log(`\n${c.cyan}${c.bright}${msg}${c.reset}`);
    } else {
        process.stdout.write(msg);
    }
});

rl.on('line', (line) => {
    let trimmed = line.trim();
    if (trimmed !== '') {
        client.write(trimmed);
        if (trimmed.toLowerCase() === 'exit') {
            console.log(`${c.red}[INFO] Keluar dari permainan...${c.reset}`);
            client.end();
            rl.close();
            process.exit(0);
        }
    }
});

client.on('close', () => {
    console.log(`\n${c.red}[INFO] Koneksi terputus dari server.${c.reset}`);
    process.exit(0);
});

client.on('error', () => {
    console.log(`${c.red}[ERROR] Gagal terhubung. Pastikan 'node server.js' sudah aktif!${c.reset}`);
    process.exit(1);
});