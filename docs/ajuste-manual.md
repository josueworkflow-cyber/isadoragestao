# Ajuste manual de faturamento

Em **Importação de Dados → Ajuste Manual → Lançar Ajuste**, escolha vendedor, fábrica e mês comercial de 2026. A consulta ao servidor mostra o total atual, incluindo ajustes anteriores. O modo padrão recebe o **valor final correto**; o modo alternativo recebe uma diferença positiva ou negativa. A prévia apresenta valor atual, diferença, valor corrigido e total mensal do vendedor após o ajuste. Aceita `10.000,00`, `10000,00`, `10000.00` e `-0,08`; valores com mais de duas casas decimais ou texto inválido são bloqueados.

## Problemas encontrados e correções

- O Excel semanal excluía ajustes, causando diferença em relação ao total mensal. Agora inclui uma linha por fábrica e uma coluna **AJUSTE MENSAL**; as colunas de semanas mantêm os lançamentos semanais originais. O total do Excel inclui as correções. A consulta também passou a filtrar o ano de 2026.
- O detalhamento de empresas considerava apenas nomes cadastrados e valores positivos. Ajustes com descrição livre ou negativos podiam ficar fora do total. Agora são agrupados como **Ajuste manual · Fábrica**, incluindo registros antigos, e os valores negativos e fornecedores não cadastrados são exibidos. Os rótulos são escapados antes de entrar no HTML.
- PDF e demais relatórios podiam continuar usando o objeto de dados anterior depois de salvar. A atualização da aplicação agora também atualiza o módulo de relatórios.
- O servidor aceitava fábrica, vendedor, mês, ano e valor sem validação suficiente. Agora valida o escopo, duas casas decimais, valores finitos, descrição e alterações efetivas; os cálculos do faturamento são feitos em centavos inteiros por registro.
- O formulário permitia envio repetido e não conferia mudanças no valor durante a edição. A tela bloqueia novos envios enquanto salva e envia o valor atual consultado. O servidor compara esse valor dentro de uma transação serializável; mudanças concorrentes retornam HTTP 409. Falhas de comunicação exigem nova consulta e conferência do histórico antes de tentar de novo.

## Onde altera os resultados

| Área | Efeito |
| --- | --- |
| Resumo Geral, vendedor, fábrica, ranking e gráficos | O ajuste entra no mês escolhido e nos acumulados que incluem esse mês. |
| Meta dinâmica | O objetivo anual permanece igual. A correção muda o saldo usado no cálculo das metas dos meses seguintes. |
| Detalhamento por empresa | Linha separada de ajuste por fábrica; os registros originais ficam preservados. |
| PDF | Usa os valores atualizados após salvar. |
| Excel semanal | Ajuste mensal separado das semanas, incluído no total final. |
| Carteira ABC, mapa e Central de Oportunidades | Continuam usando `ClientSale` do relatório Tipo 2. O ajuste mensal não identifica um cliente, portanto não corrige esses valores. |
| Número de pedidos | O ajuste não cria pedidos nem registros de clientes. |

## Histórico, reversão e novas importações

Uma correção de R$ 10.000,08 para R$ 10.000,00 cria um registro de **−R$ 0,08**. O histórico mostra mês/ano, fábrica, valor anterior, valor corrigido, diferença e motivo. Excluir esse ajuste remove a diferença dos resultados; a importação original continua preservada. Ajustes sucessivos consideram o saldo já corrigido.

O valor final informado gera uma correção naquele momento, não um total fixo para sempre. Novas importações continuam alterando o faturamento. Se um relatório for excluído e substituído por um já corrigido na origem, os ajustes anteriores permanecem: é necessário conferi-los e excluir os que perderam a finalidade para evitar aplicar a correção duas vezes. Esse comportamento também é explicado no formulário.

## API e verificação

- `GET /api/import/adjustment?vendorKey=...&factoryKey=...&month=...&year=2026`: retorna `currentValue`, `vendorTotal` e soma de ajustes existentes.
- `POST /api/import/adjustment`: modo `target` recebe `targetValue` e `expectedValue`; modo `delta` recebe `value` e pode conferir `expectedValue`. O contrato antigo com `value` continua aceito. Validação retorna 400; saldo desatualizado ou conflito de transação retorna 409.
- A gravação usa as tabelas existentes `Import` e `SupplierSale`, sem migração. O banco mantém campos `Float`; a camada de cálculos padroniza os valores monetários em centavos.
- Testes usam dados simulados, sem acesso ao banco real: centavos, diferença positiva/negativa, saldo zero, ajustes antigos, mês comercial, reconciliação entre telas e Excel, dados inválidos e conflitos.
- A prévia no navegador confirmou a correção de R$ 10.000,08 para R$ 10.000,00, o registro no histórico e a linha negativa no detalhamento do vendedor. O Excel baixado foi lido e conferido: diferença −R$ 0,08, semanas originais preservadas e total final R$ 15.000,50.

Comandos: `node --test backend/tests/*.test.js` e `node --test frontend/tests/*.test.mjs`.

Prévia local com dados em memória: `node backend/tests/preview-adjustment.cjs`. Abra `http://127.0.0.1:8771`, escolha Samuel / Pian / Setembro. A prévia utiliza os serviços reais com um banco simulado; reiniciá-la descarta todos os ajustes de exemplo.
