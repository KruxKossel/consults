// src/pages/api/replace.ts

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

const replaceHandler = async (req: NextApiRequest, res: NextApiResponse) => {
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
    const cidade = Array.isArray(fields.cidade) ? fields.cidade[0] : fields.cidade;
    const uf = Array.isArray(fields.uf) ? fields.uf[0] : fields.uf;

    if (!file) {
      return res.status(400).json({ success: false, message: 'Arquivo não enviado' });
    }

    const tempFilePath = file.filepath;

    try {
      const rows = await readXlsxFile(tempFilePath);
      const daysOfWeek = ["segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo"];

      // Verifique se a cidade existe para substituir os dados
      const { data: existingSemana, error: findError } = await supabaseAdmin
        .from('semanas')
        .select('*')
        .eq('cidade', cidade)
        .eq('uf', uf)
        .single();

      if (findError) {
        throw findError;
      }

      const semana_id = existingSemana.id;

      // Delete os dados existentes na tabela `planilhas`
      const { error: deleteError } = await supabaseAdmin
        .from('planilhas')
        .delete()
        .eq('semana_id', semana_id);

      if (deleteError) {
        throw deleteError;
      }

      // Inserir novos dados na tabela `planilhas`
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];

        if (row[0] === cidade && row[1] === uf) {
          const sanitizedRows = [];
          for (let j = 2; j < row.length; j++) {
            sanitizedRows.push({
              semana_id,
              dia_semana: daysOfWeek[j - 2],
              status: row[j]
            });
          }

          for (const sanitizedRow of sanitizedRows) {
            const { error: insertError } = await supabaseAdmin.from('planilhas').insert([sanitizedRow]);
            if (insertError) throw insertError;
          }
        }
      }

      fs.unlinkSync(tempFilePath);

      res.status(200).json({ success: true, message: 'Dados substituídos com sucesso.' });
    } catch (error) {
      console.error("Erro ao processar o upload:", error);
      res.status(500).json({ success: false, message: "Ocorreu um erro ao processar a substituição dos dados." });
    }
  });
};

export default replaceHandler;
