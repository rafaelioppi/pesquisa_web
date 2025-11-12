// 🌐 Busca na web usando Google Custom Search API + Gemini
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import fs from 'fs';

dotenv.config();

// Função de busca na web
// 🌐 Busca na web usando Google Custom Search API
async function buscarNaWeb(assunto) {
  const url = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(assunto)}&key=${process.env.GOOGLE_API_KEY}&cx=${process.env.GOOGLE_CX}`;

  try {
    const response = await fetch(url);
    const result = await response.json();

    if (!result.items || result.items.length === 0) {
      console.log("🚫 Nenhum resultado encontrado.");
      return "sem resultados recentes";
    }

    // 🔎 Mostra cada resultado cru no console
    result.items.forEach(item => {
      console.log("🔎 Título:", item.title);
      console.log("📝 Snippet:", item.snippet);
      console.log("🔗 Link:", item.link);
      console.log("------");
    });

    // Retorna apenas os snippets concatenados
    const snippets = result.items.map(item => item.snippet).join(" ");
    return snippets.slice(0, 500); // limita para não ficar muito grande
  } catch (error) {
    console.error("❌ Erro ao buscar com Google API:", error);
    return "sem resultados recentes";
  }
}


// Função que chama Gemini
async function gerarTextoComGemini(assunto, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

  const body = {
    contents: [{ parts: [{ text: prompt }]}]
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    const resultado = data?.candidates?.[0]?.content?.parts?.[0]?.text || "❌ Falha na geração de conteúdo.";

    // 🔐 Salvar histórico detalhado
    salvarHistorico(assunto, prompt, resultado, {
      modelVersion: data.modelVersion,
      responseId: data.responseId,
      usageMetadata: data.usageMetadata
    });

    return resultado;
  } catch (error) {
    console.error("❌ Erro ao chamar Gemini:", error);
    return "❌ Falha na geração de conteúdo.";
  }
}

// Função para salvar histórico sem corromper JSON
function salvarHistorico(assunto, prompt, resultado, metadata) {
  const entrada = {
    assunto,
    prompt,
    resultado,
    modelVersion: metadata.modelVersion,
    responseId: metadata.responseId,
    usageMetadata: metadata.usageMetadata,
    data: new Date().toISOString()
  };

  let historico = [];
  if (fs.existsSync('historico.json')) {
    try {
      historico = JSON.parse(fs.readFileSync('historico.json', 'utf-8'));
    } catch (e) {
      console.error("⚠️ Arquivo historico.json corrompido, recriando...");
      historico = [];
    }
  }

  historico.push(entrada);

  fs.writeFileSync('historico.json', JSON.stringify(historico, null, 2));
  console.log("📌 Histórico atualizado com sucesso!");
}

// Integração: pesquisa + Gemini
async function gerarTextoComGeminiOuWeb(assunto) {
  console.log(`🌐 Pesquisando na internet sobre: ${assunto}`);
  const resultados = await buscarNaWeb(assunto);

  const contexto = `Resumo positivo e inspirador sobre ${assunto}: ${resultados}`;

  const prompt = `Crie um post inspirador para o X (máx 344 caracteres), usando emojis e hashtags.
  Use como base estas informações, mas NÃO copie manchetes, NÃO cite veículos de imprensa e NÃO inclua links: ${contexto}.`;

  const textoGerado = await gerarTextoComGemini(assunto, prompt);

  console.log("✅ Post gerado:", textoGerado);
  return textoGerado;
}

// Exemplo de uso
gerarTextoComGeminiOuWeb("notícias atuais Rio Grande do Sul");
