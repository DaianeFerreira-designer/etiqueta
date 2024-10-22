// Carregar módulos necessários
const axios = require('axios');
require('dotenv').config();
const { google } = require('googleapis');

// Função para criar etiquetas
function criarEtiqueta(nomeCliente, sku) {
    let conteudo;
    if (['SB012', 'SB013', 'SB014'].includes(sku)) {
        conteudo = `NOME: ${nomeCliente}
TOMAR 2 CAPS ao dia - 1 branca e 1 azul
USO: INTERNO F.S.A: 90 CAPS
FAB: 08/2024 VAL: 24 MESES
DR. ROMULO CRUZ
CRM-MA: 4953/CRM-TO 2039
PRODUZIDO POR CNPJ: 12.185.547/0001-98`;
    } else if (['SB001', 'SB021', 'SB022'].includes(sku)) {
        conteudo = `NOME: ${nomeCliente}
TOMAR 6 CAPS POR DIA
USO: INTERNO F.S.A: 180 CAPS
FAB: 08/2024 VAL: 24 MESES
DR. ROMULO CRUZ
CRM-MA: 4953/CRM-TO 2039
PRODUZIDO POR CNPJ: 12.185.547/0001-98`;
    } else if (['SB002', 'SB010', 'SB011', 'SB015', 'SB016', 'SB019', 'SB009'].includes(sku)) {
        conteudo = `NOME: ${nomeCliente}
TOMAR 2 CAPS POR DIA
USO: INTERNO F.S.A: 60 CAPS
FAB: 08/2024 VAL: 24 MESES
DR. ROMULO CRUZ
CRM-MA: 4953/CRM-TO 2039
PRODUZIDO POR CNPJ: 12.185.547/0001-98`;
    } else if (['SB003', 'SB006', 'SB007', 'SB008', 'SB017', 'SB018', 'SB020'].includes(sku)) {
        conteudo = `NOME: ${nomeCliente}
TOMAR 2 CAPS POR DIA
USO: INTERNO F.S.A: 120 CAPS
FAB: 08/2024 VAL: 24 MESES
DR. ROMULO CRUZ
CRM-MA: 4953/CRM-TO 2039
PRODUZIDO POR CNPJ: 12.185.547/0001-98`;
    }
    return conteudo;
}

// Função para buscar separações no Tiny ERP
async function buscarSeparacoes() {
    const token = process.env.TINY_API_TOKEN; // Obtendo o token do arquivo .env
    try {
        const response = await axios.get(`https://api.tiny.com.br/api2/separacao.pesquisa.php?token=${token}&situacao=2&formato=json`);
        console.log('Resposta da API buscar separações:', response.data);
        if (response.data && response.data.retorno && response.data.retorno.separacoes) {
            return response.data.retorno.separacoes;
        } else {
            console.error('Estrutura de resposta inesperada:', response.data);
            return [];
        }
    } catch (error) {
        console.error('Erro ao buscar separações:', error.response ? error.response.data : error.message);
        return [];
    }
}

// Função para obter detalhes da separação pelo ID
async function obterDetalhesSeparacao(idSeparacao) {
    const token = process.env.TINY_API_TOKEN; // Obtendo o token do arquivo .env
    try {
        const response = await axios.get(`https://api.tiny.com.br/api2/separacao.obter.php?token=${token}&idSeparacao=${idSeparacao}&formato=json`);
        console.log('Resposta da API obter detalhes da separação:', response.data);
        if (response.data && response.data.retorno && response.data.retorno.separacao) {
            return response.data.retorno.separacao;
        } else {
            console.error('Estrutura de resposta inesperada ao obter detalhes da separação:', response.data);
            return null;
        }
    } catch (error) {
        console.error('Erro ao obter detalhes da separação:', error.response ? error.response.data : error.message);
        return null;
    }
}

// Função para enviar dados para o Google Sheets
async function enviarParaGoogleSheets(dados) {
    const { GOOGLE_SHEETS_CLIENT_ID, GOOGLE_SHEETS_CLIENT_SECRET, GOOGLE_SHEETS_REDIRECT_URI, GOOGLE_SHEETS_REFRESH_TOKEN } = process.env;

    const oauth2Client = new google.auth.OAuth2(
        GOOGLE_SHEETS_CLIENT_ID,
        GOOGLE_SHEETS_CLIENT_SECRET,
        GOOGLE_SHEETS_REDIRECT_URI
    );

    // Configurar o token de refresh
    oauth2Client.setCredentials({ refresh_token: GOOGLE_SHEETS_REFRESH_TOKEN });

    const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
    
    try {
        // Adicionar uma nova linha ao Google Sheets
        await sheets.spreadsheets.values.append({
            spreadsheetId: 'seu_spreadsheet_id', // Substitua pelo seu ID da planilha
            range: 'Página1!A1', // Altere o nome da página conforme necessário
            valueInputOption: 'RAW',
            resource: {
                values: dados,
            },
        });
        console.log('Dados enviados para o Google Sheets com sucesso!');
    } catch (error) {
        console.error('Erro ao enviar dados para o Google Sheets:', error);
    }
}

// Função principal para processar separações e criar etiquetas
async function processarSeparacoes() {
    const separacoes = await buscarSeparacoes();
    if (!separacoes || separacoes.length === 0) {
        console.log('Nenhuma separação encontrada.');
        return;
    }

    const todasNotas = []; // Para armazenar todas as notas antes de gerar o PDF

    for (const separacao of separacoes) {
        const idSeparacao = separacao.id; // Obter o ID da separação
        const nomeCliente = separacao.destinatario; // Nome do cliente atrelado ao endereço de entrega

        // Obter detalhes da separação usando o ID
        const detalhesSeparacao = await obterDetalhesSeparacao(idSeparacao);

        if (detalhesSeparacao && detalhesSeparacao.itens && detalhesSeparacao.itens.length > 0) {
            detalhesSeparacao.itens.forEach(item => {
                console.log('Item encontrado:', item);
                const quantidade = parseInt(item.quantidade, 10); // Obter a quantidade do item como número
                const nota = criarEtiqueta(nomeCliente, item.codigo); // Usar SKU como código

                // Adicionar a nota à lista de acordo com a quantidade
                for (let i = 0; i < quantidade; i++) {
                    todasNotas.push([nota]); // Armazena a nota como uma linha
                }
            });
        } else {
            console.log('A separação não contém itens ou não foi encontrada:', separacao);
        }
    }

    // Enviar todas as notas para o Google Sheets
    await enviarParaGoogleSheets(todasNotas);
}

// Executar a função principal
processarSeparacoes();
