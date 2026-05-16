import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { Upload, FileText, Trash2, Download, Eye, FolderPlus, Grid3x3, List } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/documentos")({
  beforeLoad: async () => {
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
  },
  component: DocumentosPage,
});

const mockDocuments = [
  { id: 1, name: "Cotação Honda Civic 2022", type: "PDF", size: "2.4 MB", date: "15/01/2025", category: "Cotações" },
  { id: 2, name: "Proposta Allianz (PRO-2025-001234)", type: "PDF", size: "1.8 MB", date: "15/01/2025", category: "Propostas" },
  { id: 3, name: "RG - João Silva", type: "Imagem", size: "850 KB", date: "14/01/2025", category: "Cliente" },
  { id: 4, name: "CPF - João Silva", type: "Imagem", size: "720 KB", date: "14/01/2025", category: "Cliente" },
  { id: 5, name: "Comprovante de Residência", type: "PDF", size: "1.2 MB", date: "14/01/2025", category: "Cliente" },
  { id: 6, name: "Histórico de Sinistros", type: "PDF", size: "950 KB", date: "13/01/2025", category: "Histórico" },
  { id: 7, name: "Contrato Anterior (Bradesco)", type: "PDF", size: "2.1 MB", date: "13/01/2025", category: "Histórico" },
  { id: 8, name: "Nota Fiscal Veículo", type: "PDF", size: "1.5 MB", date: "12/01/2025", category: "Veículo" },
];

const categories = ["Todos", "Cotações", "Propostas", "Cliente", "Veículo", "Histórico"];

function DocumentosPage() {
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const filteredDocs = selectedCategory === "Todos" ? mockDocuments : mockDocuments.filter((d) => d.category === selectedCategory);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Gestão de Documentos"
        title="Centro de Documentos"
        description="Todos os arquivos, contratos e documentos relacionados aos clientes"
        actions={
          <button className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 hover:bg-primary/90 transition-colors">
            <Upload className="size-4" /> Enviar Arquivo
          </button>
        }
      />

      {/* Upload Area */}
      <div className="mb-8 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-8 text-center">
        <Upload className="w-8 h-8 text-primary mx-auto mb-3" />
        <h3 className="font-semibold text-foreground mb-1">Arraste documentos aqui</h3>
        <p className="text-sm text-muted-foreground mb-4">ou</p>
        <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
          Selecionar Arquivo
        </button>
        <p className="text-xs text-muted-foreground mt-4">PDF, Imagem, Word · Máx 10 MB</p>
      </div>

      {/* Category Filter */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`flex-shrink-0 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              selectedCategory === cat
                ? "bg-primary text-primary-foreground"
                : "bg-surface border border-border hover:bg-surface/50"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* View Mode Toggle */}
      <div className="mb-6 flex items-center gap-2">
        <p className="text-sm text-muted-foreground">Visualização:</p>
        <button
          onClick={() => setViewMode("grid")}
          className={`p-2 rounded-lg transition-colors ${
            viewMode === "grid" ? "bg-surface text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Grid3x3 className="w-4 h-4" />
        </button>
        <button
          onClick={() => setViewMode("list")}
          className={`p-2 rounded-lg transition-colors ${
            viewMode === "list" ? "bg-surface text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <List className="w-4 h-4" />
        </button>
      </div>

      {/* Documents Grid */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredDocs.map((doc) => (
            <div key={doc.id} className="rounded-lg border border-border bg-card p-4 hover:border-primary/50 transition-colors group">
              <div className="flex items-center justify-center w-full h-32 bg-secondary/50 rounded-lg mb-3">
                <FileText className="w-8 h-8 text-muted-foreground" />
              </div>
              <h4 className="font-medium text-sm text-foreground line-clamp-2 mb-2">{doc.name}</h4>
              <p className="text-xs text-muted-foreground mb-3">{doc.size}</p>
              <p className="text-xs text-muted-foreground px-2 py-1 bg-secondary/50 rounded-full inline-block mb-3">{doc.category}</p>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs rounded bg-primary text-primary-foreground hover:bg-primary/90">
                  <Eye className="w-3 h-3" />
                </button>
                <button className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs rounded bg-secondary hover:bg-secondary/70">
                  <Download className="w-3 h-3" />
                </button>
                <button className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs rounded bg-red-100 text-red-600 hover:bg-red-200">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Documents List */
        <div className="rounded-xl border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-secondary/50 border-b border-border">
              <tr>
                <th className="text-left font-medium px-6 py-4 text-xs">Nome do Arquivo</th>
                <th className="text-left font-medium px-6 py-4 text-xs">Tipo</th>
                <th className="text-left font-medium px-6 py-4 text-xs">Categoria</th>
                <th className="text-right font-medium px-6 py-4 text-xs">Tamanho</th>
                <th className="text-right font-medium px-6 py-4 text-xs">Data</th>
                <th className="text-center font-medium px-6 py-4 text-xs">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocs.map((doc) => (
                <tr key={doc.id} className="border-t border-border hover:bg-surface/50 transition-colors">
                  <td className="px-6 py-4 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="font-medium text-foreground">{doc.name}</span>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">{doc.type}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-secondary/50 text-xs rounded">{doc.category}</span>
                  </td>
                  <td className="px-6 py-4 text-right text-muted-foreground">{doc.size}</td>
                  <td className="px-6 py-4 text-right text-muted-foreground">{doc.date}</td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button className="p-1.5 hover:bg-secondary rounded transition-colors">
                        <Eye className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <button className="p-1.5 hover:bg-secondary rounded transition-colors">
                        <Download className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <button className="p-1.5 hover:bg-red-100 rounded transition-colors">
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary */}
      <div className="mt-6 rounded-lg border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">
          <strong>{filteredDocs.length} documentos</strong> encontrados · <strong>Espaço usado:</strong> 12.4 MB de 100 MB
        </p>
      </div>
    </AppShell>
  );
}
