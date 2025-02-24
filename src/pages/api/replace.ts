// src/pages/api/replace.ts

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

    const cidadeArray = fields.cidade as string[];
    const ufArray = fields.uf as string[];

    const cidade = cidadeArray[0];
    const uf = ufArray[0];

    console.log("Cidade recebida:", cidade);
    console.log("UF recebida:", uf);

    if (!cidade || !uf) {
      return res.status(400).json({ success: false, message: 'Cidade e UF não fornecidos corretamente' });
    }

    const tempFilePath = file.filepath;

    try {
      const rows = await readXlsxFile(tempFilePath);
      console.log("Linhas lidas da planilha:", rows);

      const expectedColumns = ["NOME DA CIDADE", "UF", "SEGUNDA", "TERÇA", "QUARTA", "QUINTA", "SEXTA", "SÁBADO", "DOMINGO"];
      const columnHeaders = rows[0].map(toLowerCaseString);

      console.log("Cabeçalhos das colunas:", columnHeaders);

      const isValidFormat = expectedColumns.every((col, index) => col.toLowerCase() === columnHeaders[index]);

      if (!isValidFormat) {
        console.error("Formato da planilha inválido:", { expectedColumns, columnHeaders });
        return res.status(400).json({ success: false, message: "O formato da planilha não está conforme o padrão estabelecido." });
      }

      let substitutionDone = false;

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];

        if (toLowerCaseString(row[0]) !== toLowerCaseString(cidade) || toLowerCaseString(row[1]) !== toLowerCaseString(uf)) {
          continue;
        }

        console.log(`Substituindo dados para a cidade ${cidade} e UF ${uf}`);

        const { data: existingSemana, error: findError } = await supabaseAdmin
          .from('semanas')
          .select('*')
          .eq('cidade', toLowerCaseString(row[0]))
          .eq('uf', toLowerCaseString(row[1]))
          .eq('usuario_id', user.id)
          .single();

        if (findError || !existingSemana) {
          console.error("Erro ao encontrar a semana existente:", findError);
          return res.status(500).json({ success: false, message: "Erro ao encontrar a semana existente para substituição." });
        }

        const { id: semana_id } = existingSemana;

        const { error: deleteError } = await supabaseAdmin
          .from('planilhas')
          .delete()
          .eq('semana_id', semana_id);

        if (deleteError) {
          console.error("Erro ao excluir os dados de planilhas existentes:", deleteError);
          return res.status(500).json({ success: false, message: "Erro ao excluir os dados de planilhas existentes." });
        }

        const diasSemana = ["segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo"];
        for (let j = 2; j <= 8; j++) {
          const diaSemana = diasSemana[j - 2];
          const status = row[j];

          const statusValue = typeof status === 'number' ? status : Number(status);
          if (isNaN(statusValue)) {
            console.error(`Valor de status inválido para ${diaSemana}:`, row[j]);
            continue;
          }

          const { error: insertPlanilhaError } = await supabaseAdmin
            .from('planilhas')
            .insert([{ semana_id, dia_semana: diaSemana, status: statusValue }]);

          if (insertPlanilhaError) {
            console.error("Erro ao inserir dia da semana:", insertPlanilhaError);
            throw insertPlanilhaError;
          }
        }

        substitutionDone = true;
      }

      fs.unlinkSync(tempFilePath);

      if (substitutionDone) {
        console.log("Substituição realizada com sucesso.");
        return res.status(200).json({ success: true, message: 'Substituição realizada com sucesso.' });
      } else {
        console.log("Nenhuma substituição necessária.");
        return res.status(200).json({ success: true, message: 'Nenhuma substituição necessária.' });
      }
    } catch (error) {
      console.error("Erro ao processar a substituição:", error);
      return res.status(500).json({ success: false, message: "Ocorreu um erro ao processar a substituição da planilha." });
    }
  });
};

export default replaceHandler;
