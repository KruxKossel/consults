// src/pages/api/upload.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import readXlsxFile, { CellValue } from 'read-excel-file/node';
import formidable from 'formidable';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

export const config = {
  api: {
    bodyParser: false,
  },
};

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const toLowerCaseString = (value: CellValue): string => {
  return typeof value === 'string' ? value.toLowerCase() : '';
};

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
    return res.status(401).json({ success: false, message: 'Usuário não autenticado' });
  }

  const form = formidable({ multiples: false });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Erro ao processar o upload do arquivo.' });
    }

    const file = Array.isArray(files.file) ? files.file[0] : files.file;

    if (!file) {
      return res.status(400).json({ success: false, message: 'Arquivo não enviado' });
    }

    const tempFilePath = file.filepath;

    try {
      const rows = await readXlsxFile(tempFilePath);

      const expectedColumns = ["NOME DA CIDADE", "UF", "SEGUNDA", "TERÇA", "QUARTA", "QUINTA", "SEXTA", "SÁBADO", "DOMINGO"];
      const columnHeaders = rows[0].map(toLowerCaseString);

      const isValidFormat = expectedColumns.every((col, index) => col.toLowerCase() === columnHeaders[index]);

      if (!isValidFormat) {
        return res.status(400).json({ success: false, message: "O formato da planilha não está conforme o padrão estabelecido." });
      }

      const duplicates = [];
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];

        const { data: existingSemana, error: findError } = await supabaseAdmin
          .from('semanas')
          .select('*')
          .eq('cidade', toLowerCaseString(row[0]))
          .eq('uf', toLowerCaseString(row[1]))
          .eq('usuario_id', user.id)
          .single();

        if (findError && findError.code !== 'PGRST116') {
          throw findError;
        }

        if (existingSemana) {
          duplicates.push({ cidade: row[0], uf: row[1], semana_id: existingSemana.id });
        }
      }

      if (duplicates.length > 0) {
        return res.status(200).json({ success: false, message: `Algumas cidades já existem. Deseja substituir os dados?`, confirmReplace: true, duplicates });
      } else {
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];

          const { data: insertedSemana, error: insertError } = await supabaseAdmin
            .from('semanas')
            .insert([{ cidade: toLowerCaseString(row[0]) as string, uf: toLowerCaseString(row[1]) as string, usuario_id: user.id }])
            .select()
            .single();

          if (insertError) {
            throw insertError;
          }

          const { id: semana_id } = insertedSemana;

          const diasSemana = ["segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo"];
          for (let j = 2; j <= 8; j++) {
            const diaSemana = diasSemana[j - 2];
            const status = row[j];

            const statusValue = typeof status === 'number' ? status : Number(status);
            if (isNaN(statusValue)) {
              continue;
            }

            const { error: insertPlanilhaError } = await supabaseAdmin
              .from('planilhas')
              .insert([{ semana_id, dia_semana: diaSemana, status: statusValue }]);

            if (insertPlanilhaError) {
              throw insertPlanilhaError;
            }
          }
        }

        fs.unlinkSync(tempFilePath);
        return res.status(200).json({ success: true, message: 'Upload realizado com sucesso. Nenhuma cidade duplicada encontrada.' });
      }
    } catch (error) {
      return res.status(500).json({ success: false, message: "Ocorreu um erro ao processar o upload da planilha." });
    }
  });
};

export default uploadHandler;
