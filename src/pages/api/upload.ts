// src/pages/api/upload.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import readXlsxFile from 'read-excel-file/node';
import formidable from 'formidable';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Configuração para desativar o bodyParser padrão do Next.js, já que estamos usando o formidable para processar uploads de arquivos
export const config = {
  api: {
    bodyParser: false,
  },
};

// Crie um novo cliente Supabase no lado do servidor
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Use a chave de função de serviço do Supabase
);

// Handler para a API de upload
const uploadHandler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Método não permitido' });
  }

  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Token de autenticação não fornecido' });
  }

  const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

  if (userError || !user) {
    console.error('Erro ao obter o usuário autenticado:', userError);
    return res.status(401).json({ success: false, message: 'Usuário não autenticado' });
  }

  const form = formidable({ multiples: false });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("Erro ao parsear o formulário:", err);
      return res.status(500).json({ success: false, message: "Erro ao processar o upload do arquivo." });
    }

    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    console.log("Arquivo recebido:", file);

    if (!file) {
      return res.status(400).json({ success: false, message: 'Arquivo não enviado' });
    }

    const tempFilePath = file.filepath;

    try {
      const rows = await readXlsxFile(tempFilePath);
      console.log("Linhas lidas da planilha:", rows);

      const expectedColumns = ["NOME DA CIDADE", "UF", "SEGUNDA", "TERÇA", "QUARTA", "QUINTA", "SEXTA", "SÁBADO", "DOMINGO"];
      const columnHeaders = rows[0].map(header => header.toString().toUpperCase());

      console.log("Cabeçalhos das colunas:", columnHeaders);

      const isValidFormat = expectedColumns.every((col, index) => col === columnHeaders[index]);

      if (!isValidFormat) {
        console.error("Formato da planilha inválido:", { expectedColumns, columnHeaders });
        return res.status(400).json({ success: false, message: "O formato da planilha não está conforme o padrão estabelecido." });
      }

      const duplicates = [];
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];

        // Verifique se a cidade já existe
        const { data: existingSemana, error: findError } = await supabaseAdmin
          .from('semanas')
          .select('*')
          .eq('cidade', row[0])
          .eq('uf', row[1])
          .single();

        if (findError && findError.code !== 'PGRST116') {
          throw findError;
        }

        if (existingSemana) {
          duplicates.push({ cidade: row[0], uf: row[1], semana_id: existingSemana.id });
        }
      }

      fs.unlinkSync(tempFilePath);

      if (duplicates.length > 0) {
        return res.status(200).json({ success: false, message: `Algumas cidades já existem. Deseja substituir os dados?`, confirmReplace: true, duplicates });
      } else {
        return res.status(200).json({ success: true, message: 'Upload realizado com sucesso. Nenhuma cidade duplicada encontrada.' });
      }
    } catch (error) {
      console.error("Erro ao processar o upload:", error);
      return res.status(500).json({ success: false, message: "Ocorreu um erro ao processar o upload da planilha." });
    }
  });
};

export default uploadHandler;
