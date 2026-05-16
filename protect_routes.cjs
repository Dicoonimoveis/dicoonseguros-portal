const fs = require('fs');
const path = require('path');

const adminRoutes = [
  'admin.importar-apolice.tsx',
  'admin.tsx',
  'clientes.tsx',
  'comparador.tsx',
  'dashboard-admin.tsx',
  'documentos.tsx',
  'leads.tsx',
  'multicalculo.tsx',
  'nova-cotacao.tsx',
  'pipeline.tsx',
  'proposta.tsx',
  'propostas.tsx',
  'renovacoes.tsx',
  'timeline.tsx'
];

const protectionSnippet = `beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/login" });
    }
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.session.user.id);
    const isAdmin = (roles ?? []).some((r) => r.role === "admin");
    if (!isAdmin) {
      throw redirect({ to: "/acesso-negado" });
    }
  }`;

const clientSnippet = `beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/login" });
    }
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.session.user.id);
    const isAdmin = (roles ?? []).some((r) => r.role === "admin");
    if (isAdmin) {
      throw redirect({ to: "/dashboard-admin" });
    }
  }`;

const routesDir = path.join(__dirname, 'src', 'routes');

function replaceBeforeLoad(content, snippet) {
  const beforeLoadIdx = content.indexOf('beforeLoad:');
  if (beforeLoadIdx === -1) {
    // If no beforeLoad, we just inject it before `component:`
    return content.replace(/(\s*)(component:)/, `$1${snippet},$1$2`);
  }

  // Find the end of beforeLoad by counting braces
  let braceCount = 0;
  let started = false;
  let endIdx = -1;

  for (let i = beforeLoadIdx; i < content.length; i++) {
    if (content[i] === '{') {
      started = true;
      braceCount++;
    } else if (content[i] === '}') {
      braceCount--;
      if (started && braceCount === 0) {
        endIdx = i;
        break;
      }
    }
  }

  if (endIdx !== -1) {
    return content.substring(0, beforeLoadIdx) + snippet + content.substring(endIdx + 1);
  }
  
  return content;
}

for (const file of fs.readdirSync(routesDir)) {
  if (file.endsWith('.tsx') && (adminRoutes.includes(file) || file === 'dashboard-cliente.tsx')) {
    const filePath = path.join(routesDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // ensure imports
    if (!content.includes('import { supabase }')) {
      content = 'import { supabase } from "@/integrations/supabase/client";\n' + content;
    }
    if (!content.includes('redirect')) {
      content = content.replace('createFileRoute', 'createFileRoute, redirect');
    }
    
    const snippet = file === 'dashboard-cliente.tsx' ? clientSnippet : protectionSnippet;
    content = replaceBeforeLoad(content, snippet);
    
    fs.writeFileSync(filePath, content);
    console.log(`Updated ${file}`);
  }
}
