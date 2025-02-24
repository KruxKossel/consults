// src/pages/api/upload.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import readXlsxFile, { CellValue } from 'read-excel-file/node';
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

// Função para converter valores de célula para string em minúsculas
const toLowerCaseString = (value: CellValue): string => {
  return typeof value === 'string' ? value.toLowerCase() : '';
};

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
      const columnHeaders = rows[0].map(toLowerCaseString);

      console.log("Cabeçalhos das colunas:", columnHeaders);

      const isValidFormat = expectedColumns.every((col, index) => col.toLowerCase() === columnHeaders[index]);

      if (!isValidFormat) {
        console.error("Formato da planilha inválido:", { expectedColumns, columnHeaders });
        return res.status(400).json({ success: false, message: "O formato da planilha não está conforme o padrão estabelecido." });
      }

      const duplicates = [];
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        console.log("Processando linha:", row);

        // Verifique se a cidade já existe para o usuário atual
        const { data: existingSemana, error: findError } = await supabaseAdmin
          .from('semanas')
          .select('*')
          .eq('cidade', toLowerCaseString(row[0]))
          .eq('uf', toLowerCaseString(row[1]))
          .eq('usuario_id', user.id)
          .single();

        if (findError && findError.code !== 'PGRST116') {
          console.error("Erro ao verificar duplicatas:", findError);
          throw findError;
        }

        if (existingSemana) {
          duplicates.push({ cidade: row[0], uf: row[1], semana_id: existingSemana.id });
        }
      }

      if (duplicates.length > 0) {
        console.log("Cidades duplicadas encontradas:", duplicates);
        return res.status(200).json({ success: false, message: `Algumas cidades já existem. Deseja substituir os dados?`, confirmReplace: true, duplicates });
      } else {
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          console.log("Inserindo cidade:", row);

          const { data: insertedSemana, error: insertError } = await supabaseAdmin
            .from('semanas')
            .insert([{ cidade: toLowerCaseString(row[0]) as string, uf: toLowerCaseString(row[1]) as string, usuario_id: user.id }])
            .select()
            .single();

          if (insertError) {
            console.error("Erro ao inserir cidade:", insertError);
            throw insertError;
          }

          const { id: semana_id } = insertedSemana;

          // Inserir os dias da semana na tabela planilhas
          const diasSemana = ["segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo"];
          for (let j = 2; j <= 8; j++) {
            const diaSemana = diasSemana[j - 2];
            const status = row[j];

            console.log(`Inserindo dia da semana ${diaSemana} com status ${status} para semana_id ${semana_id}`);

            // Verifique se o status é um número válido antes de inserir
            const statusValue = typeof status === 'number' ? status : Number(status);
            if (isNaN(statusValue)) {
              console.error(`Valor de status inválido para ${diaSemana}:`, row[j]);
              continue; // Pule a inserção deste dia da semana
            }

            const { error: insertPlanilhaError } = await supabaseAdmin
              .from('planilhas')
              .insert([{ semana_id, dia_semana: diaSemana, status: statusValue }]);

            if (insertPlanilhaError) {
              console.error("Erro ao inserir dia da semana:", insertPlanilhaError);
              throw insertPlanilhaError;
            }
          }
        }

        fs.unlinkSync(tempFilePath);
        console.log("Upload realizado com sucesso.");
        return res.status(200).json({ success: true, message: 'Upload realizado com sucesso. Nenhuma cidade duplicada encontrada.' });
      }
    } catch (error) {
      console.error("Erro ao processar o upload:", error);
      return res.status(500).json({ success: false, message: "Ocorreu um erro ao processar o upload da planilha." });
    }
  });
};

export default uploadHandler;
