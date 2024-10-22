const { google } = require('googleapis');
require('dotenv').config();

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_SHEETS_CLIENT_ID,
    process.env.GOOGLE_SHEETS_CLIENT_SECRET,
    process.env.GOOGLE_SHEETS_REDIRECT_URI
);

// Configurando o Refresh Token
oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_SHEETS_REFRESH_TOKEN
});

// Função para obter um novo Access Token
async function refreshAccessToken() {
    try {
        const { token } = await oauth2Client.getAccessToken();
        console.log(`Novo Access Token: ${token}`);
        return token;
    } catch (error) {
        console.error('Erro ao obter novo Access Token:', error);
    }
}

// Função para acessar os dados do Google Sheets
async function accessGoogleSheet() {
    const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
    const spreadsheetId = '1Qy-eG-9i99gc5Hh_w2p215oj_epZREI2OjTXzJFG8yQ'; // ID da sua planilha
    const range = 'Sheet1!A1:B10'; // O intervalo de células que você deseja acessar

    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range,
        });
        const rows = response.data.values;

        if (rows.length) {
            console.log('Dados da planilha:');
            rows.forEach((row) => {
                console.log(row);
            });
        } else {
            console.log('Nenhum dado encontrado.');
        }
    } catch (error) {
        console.error('Erro ao acessar a planilha:', error);
    }
}

// Chama a função para testar
(async () => {
    await refreshAccessToken();
    await accessGoogleSheet();
})();
