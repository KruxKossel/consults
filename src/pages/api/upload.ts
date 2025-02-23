// src/pages/api/upload.ts
import { NextApiRequest, NextApiResponse } from 'next';
import readXlsxFile, { CellValue } from 'read-excel-file/node';
import { supabase } from '../../supabaseClient';
import { buffer } from 'micro';

export const config = {
  api: {
    bodyParser: false,
  },
};

const uploadHandler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Método não permitido' });
  }

  try {
    const body = await buffer(req, { limit: '10mb' });
    console.log("Buffer recebido:", body);

    // Simulação de obtenção de caminho do arquivo
    const filePath = 'path_to_your_uploaded_file'; // Substitua pelo caminho real do arquivo

    const rows = await readXlsxFile(filePath);
    console.log("Linhas lidas da planilha:", rows);

    const expectedColumns = ["nome da cidade", "uf", "segunda", "terca", "quarta", "quinta", "sexta", "sabado", "domingo"];
    const columnHeaders = rows[0].map((header: CellValue) => {
      if (typeof header === 'string') {
        return header.toLowerCase();
      }
      throw new Error('Formato de cabeçalho inválido');
    });

    console.log("Cabeçalhos das colunas:", columnHeaders);

    // Verificar se a planilha está no formato esperado
    const isValidFormat = expectedColumns.every((col, index) => col === columnHeaders[index]);

    if (!isValidFormat) {
      return res.status(400).json({ success: false, message: "O formato da planilha não está conforme o padrão estabelecido." });
    }

    // Sanitizar e preparar os dados para inserção
    const sanitizedRows = rows.slice(1).map((row: CellValue[]) => ({
      cidade: typeof row[0] === 'string' ? row[0].trim() : '',
      uf: typeof row[1] === 'string' ? row[1].trim() : '',
      segunda: row[2],
      terca: row[3],
      quarta: row[4],
      quinta: row[5],
      sexta: row[6],
      sabado: row[7],
      domingo: row[8],
    }));

    console.log("Linhas sanitizadas:", sanitizedRows);

    // Inserir os dados no banco de dados
    for (const row of sanitizedRows) {
      const { error } = await supabase.from('tabela_de_horarios').insert([row]);
      if (error) throw error;
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Erro ao processar o upload:", error);
    res.status(500).json({ success: false, message: "Ocorreu um erro ao processar o upload da planilha." });
  }
};

export default uploadHandler;
