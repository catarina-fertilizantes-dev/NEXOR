import { AlertCircle, Info, Camera, FileText, CheckCircle, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const CarregamentosSection = () => {
  return (
    <section id="carregamentos" className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">🚚 Carregamentos</h2>
        <p className="text-muted-foreground">Gerencie o processo completo de carregamento - da chegada do caminhão até a finalização.</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            A funcionalidade de Carregamentos possui duas páginas principais: a <strong className="text-foreground">Lista de Carregamentos</strong>, onde você 
            visualiza todos os carregamentos do armazém, e os <strong className="text-foreground">Detalhes do Carregamento</strong>, onde você gerencia as 6 etapas 
            do processo, anexando fotos e documentos necessários.
          </p>
        </CardContent>
      </Card>

      {/* 6.2 Lista de Carregamentos */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">Lista de Carregamentos</h3>

        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-foreground mb-2">O que você pode fazer</h4>
            <div className="space-y-1">
              {[
                "Visualizar todos os carregamentos do armazém",
                "Filtrar por status, data ou transportadora",
                "Acessar os detalhes de cada carregamento",
                "Acompanhar o progresso através da barra de progresso",
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-foreground">
                  <span className="text-green-600 dark:text-green-400">✅</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-medium text-foreground mb-2">Entendendo os Status nos Badges</h4>
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                { status: "Aguardando", color: "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400", desc: "Aguardando chegada do veículo" },
                { status: "Em andamento", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400", desc: "Processo em execução" },
                { status: "Documentação", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400", desc: "Aguardando anexo de documentos" },
                { status: "Finalizado", color: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400", desc: "Carregamento concluído com sucesso" },
                { status: "Cancelado", color: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400", desc: "Carregamento foi cancelado" },
              ].map((item, i) => (
                <Card key={i}>
                  <CardContent className="p-3 flex items-start gap-3">
                    <Badge className={item.color}>{item.status}</Badge>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-medium text-foreground mb-2">Barra de Progresso</h4>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground mb-3">
                  Cada card exibe uma barra de progresso roxa indicando o andamento do carregamento:
                </p>
                <div className="space-y-1">
                  {[
                    { pct: "0%", label: "Aguardando chegada" },
                    { pct: "20%", label: "Carregamento iniciado" },
                    { pct: "40%", label: "Carregando" },
                    { pct: "60%", label: "Carregamento finalizado" },
                    { pct: "80%", label: "Anexando documentação" },
                    { pct: "100%", label: "Concluído" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400 shrink-0 w-12 justify-center">
                        {item.pct}
                      </Badge>
                      <span className="text-foreground">{item.label}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* 6.3 Detalhes do Carregamento */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">Detalhes do Carregamento</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Ao clicar em um carregamento, você acessa a página de detalhes onde gerencia todo o processo.
        </p>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Card>
              <CardContent className="p-4">
                <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                  <Info className="h-4 w-4 text-primary" />
                  Painel de Informações
                </h4>
                <p className="text-sm text-muted-foreground">
                  Exibe dados do agendamento vinculado: transportadora, motorista, placa, produto e quantidade agendada.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Estatísticas de Tempo
                </h4>
                <p className="text-sm text-muted-foreground">
                  Mostra a duração de cada etapa e o tempo total do processo de carregamento.
                </p>
              </CardContent>
            </Card>
          </div>

          <div>
            <h4 className="font-medium text-foreground mb-3">As 6 Etapas do Processo</h4>

            {/* Etapa 1 */}
            <Card className="mb-3">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white font-bold text-sm shrink-0">1</div>
                  <div className="space-y-2 flex-1">
                    <h5 className="font-semibold text-foreground">Chegada do Caminhão 🚛</h5>
                    <p className="text-sm text-muted-foreground">Registrar a chegada do veículo ao armazém. <strong>Responsável: Porteiro</strong></p>
                    <div className="space-y-1">
                      {[
                        "Anexar foto obrigatória do caminhão na portaria (frontal, mostrando a placa)",
                        "Adicionar observações (opcional)",
                        'Clicar em "Próxima"',
                      ].map((step, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm">
                          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold shrink-0 text-xs mt-0.5">{i + 1}</span>
                          <span className="text-foreground">{step}</span>
                        </div>
                      ))}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Camera className="h-3 w-3" />
                      Formatos: JPG, JPEG, PNG, WebP (máx. 5MB) · Câmera abre automaticamente no celular
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      ⏰ Data e hora registradas automaticamente
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Etapa 2 */}
            <Card className="mb-3">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white font-bold text-sm shrink-0">2</div>
                  <div className="space-y-2 flex-1">
                    <h5 className="font-semibold text-foreground">Início do Carregamento ▶️</h5>
                    <p className="text-sm text-muted-foreground">Registrar o início da operação de carregamento. <strong>Responsável: Operador</strong></p>
                    <div className="space-y-1">
                      {[
                        "Anexar foto obrigatória do início da operação (caminhão posicionado antes de iniciar a carga)",
                        "Adicionar observações (opcional)",
                        'Clicar em "Próxima"',
                      ].map((step, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm">
                          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold shrink-0 text-xs mt-0.5">{i + 1}</span>
                          <span className="text-foreground">{step}</span>
                        </div>
                      ))}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Camera className="h-3 w-3" />
                      Formatos: JPG, JPEG, PNG, WebP (máx. 5MB) · Câmera abre automaticamente no celular
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      ⏰ Data e hora registradas automaticamente
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Etapa 3 */}
            <Card className="mb-3">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white font-bold text-sm shrink-0">3</div>
                  <div className="space-y-2 flex-1">
                    <h5 className="font-semibold text-foreground">Carregando 🔄</h5>
                    <p className="text-sm text-muted-foreground">Registrar o andamento da operação de carregamento. <strong>Responsável: Operador</strong></p>
                    <div className="space-y-1">
                      {[
                        "Anexar foto obrigatória durante o carregamento (produto sendo carregado com equipamento em ação)",
                        "Adicionar observações (opcional)",
                        'Clicar em "Próxima"',
                      ].map((step, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm">
                          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold shrink-0 text-xs mt-0.5">{i + 1}</span>
                          <span className="text-foreground">{step}</span>
                        </div>
                      ))}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Camera className="h-3 w-3" />
                      Formatos: JPG, JPEG, PNG, WebP (máx. 5MB) · Câmera abre automaticamente no celular
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      ⏰ Data e hora registradas automaticamente
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Etapa 4 */}
            <Card className="mb-3">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white font-bold text-sm shrink-0">4</div>
                  <div className="space-y-2 flex-1">
                    <h5 className="font-semibold text-foreground">Carregamento Finalizado ✅</h5>
                    <p className="text-sm text-muted-foreground">Registrar a conclusão da operação de carregamento. <strong>Responsável: Operador</strong></p>
                    <div className="space-y-1">
                      {[
                        "Anexar foto obrigatória do carregamento concluído (caminhão totalmente carregado com a carga coberta/lacrada)",
                        "Adicionar observações (opcional)",
                        'Clicar em "Próxima"',
                      ].map((step, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm">
                          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold shrink-0 text-xs mt-0.5">{i + 1}</span>
                          <span className="text-foreground">{step}</span>
                        </div>
                      ))}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Camera className="h-3 w-3" />
                      Formatos: JPG, JPEG, PNG, WebP (máx. 5MB) · Câmera abre automaticamente no celular
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      ⏰ Data e hora registradas automaticamente
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Etapa 5 */}
            <Card className="mb-3">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white font-bold text-sm shrink-0">5</div>
                  <div className="space-y-3 flex-1">
                    <h5 className="font-semibold text-foreground">Documentação 📄</h5>
                    <p className="text-sm text-muted-foreground">Anexar documentos necessários para conclusão do carregamento.</p>

                    <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 p-3">
                      <p className="text-sm text-amber-700 dark:text-amber-300">
                        <strong>Regras importantes:</strong> As 3 subetapas devem ser concluídas em ordem. Somente PDFs e XMLs são aceitos. Tamanho máximo por arquivo: 7MB.
                      </p>
                    </div>

                    <div className="space-y-3">
                      {/* 5A */}
                      <Card>
                        <CardContent className="p-3">
                          <h6 className="font-medium text-foreground mb-2">5A — Documentos de Retorno</h6>
                          <p className="text-xs text-muted-foreground mb-2"><strong>Responsável: Colaborador do Faturamento</strong></p>
                          <div className="space-y-1">
                            {[
                              "Anexar PDF da Nota de Retorno",
                              "Anexar XML da Nota de Retorno",
                              'Clicar em "Enviar Documentos"',
                            ].map((step, i) => (
                              <div key={i} className="flex items-start gap-2 text-sm">
                                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold shrink-0 text-xs mt-0.5">{i + 1}</span>
                                <span className="text-foreground">{step}</span>
                              </div>
                            ))}
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">✅ Ambos arquivos são obrigatórios</p>
                        </CardContent>
                      </Card>

                      {/* 5B */}
                      <Card>
                        <CardContent className="p-3">
                          <h6 className="font-medium text-foreground mb-1">5B — Documentos de Venda</h6>
                          <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 p-2 mb-2">
                            <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">⚠️ IMPORTANTE: Esta subetapa é exclusiva da Logística.</p>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">O que você vê: mensagem "Aguardando ação do time de logística". Você não pode fazer upload aqui.</p>
                          <p className="text-sm text-foreground">O que fazer: Aguardar a Logística concluir. Quando concluírem, a subetapa 5C ficará disponível para você.</p>
                        </CardContent>
                      </Card>

                      {/* 5C */}
                      <Card>
                        <CardContent className="p-3">
                          <h6 className="font-medium text-foreground mb-2">5C — Documentos de Remessa</h6>
                          <p className="text-xs text-muted-foreground mb-2"><strong>Responsável: Colaborador do Faturamento</strong></p>
                          <div className="space-y-1">
                            {[
                              "Anexar PDF da Nota de Remessa",
                              "Anexar XML da Nota de Remessa",
                              'Clicar em "Enviar Documentos"',
                            ].map((step, i) => (
                              <div key={i} className="flex items-start gap-2 text-sm">
                                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold shrink-0 text-xs mt-0.5">{i + 1}</span>
                                <span className="text-foreground">{step}</span>
                              </div>
                            ))}
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">✅ Sistema avança automaticamente para Etapa 6 (Finalizado)</p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Etapa 6 */}
            <Card className="mb-3">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-600 text-white font-bold text-sm shrink-0">6</div>
                  <div className="space-y-2 flex-1">
                    <h5 className="font-semibold text-foreground">Finalizado 🎉</h5>
                    <p className="text-sm text-muted-foreground">Carregamento concluído com sucesso. Parabéns!</p>
                    <div className="space-y-1 text-sm">
                      <p className="font-medium text-foreground">O que acontece agora:</p>
                      {[
                        'Status muda para "Finalizado" (badge verde)',
                        "Barra de progresso mostra 100%",
                        'Card move para a seção "Carregamentos Finalizados"',
                        "Todas as informações ficam disponíveis para consulta",
                        "Não é possível editar",
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-3 w-3 text-green-600 dark:text-green-400 shrink-0" />
                          <span className="text-foreground">{item}</span>
                        </div>
                      ))}
                    </div>
                    <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 p-3">
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        <strong>Visualizar histórico:</strong> Clique no card finalizado para ver todos os detalhes, fotos e documentos anexados.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 p-4">
        <div className="flex items-center gap-2 text-red-800 dark:text-red-200 mb-2">
          <AlertCircle className="h-5 w-5" />
          <span className="font-medium">⚠️ Atenção — Perda de Dados</span>
        </div>
        <p className="text-sm text-red-700 dark:text-red-300">
          <strong>Não feche o navegador ou recarregue a página</strong> durante o preenchimento de um carregamento. 
          Dados não salvos serão perdidos permanentemente e não poderão ser recuperados.
        </p>
      </div>
    </section>
  );
};
