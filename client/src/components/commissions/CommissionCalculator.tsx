import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, PieChart, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export default function CommissionCalculator() {
  const [transactionValue, setTransactionValue] = useState<string>("");
  const [transactionType, setTransactionType] = useState<'sale' | 'rental'>('sale');
  const [commissionRate, setCommissionRate] = useState<string>("6");
  const [agencySplit, setAgencySplit] = useState<string>("50");
  const [numberOfBrokers, setNumberOfBrokers] = useState<string>("1");

  // Calculate commission values
  const calculateCommission = () => {
    const value = parseFloat(transactionValue) || 0;
    const rate = parseFloat(commissionRate) || 0;
    const split = parseFloat(agencySplit) || 0;
    const brokers = parseInt(numberOfBrokers) || 1;

    const grossCommission = value * (rate / 100);
    const brokerTotalShare = grossCommission * (split / 100);
    const agencyShare = grossCommission - brokerTotalShare;
    const perBrokerShare = brokerTotalShare / brokers;

    return {
      grossCommission,
      brokerTotalShare,
      agencyShare,
      perBrokerShare,
      brokers,
    };
  };

  const result = calculateCommission();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  // Default commission rates
  const handleTypeChange = (type: 'sale' | 'rental') => {
    setTransactionType(type);
    if (type === 'sale') {
      setCommissionRate("6");
    } else {
      setCommissionRate("100");
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Input Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Calculadora de Comissões
          </CardTitle>
          <CardDescription>
            Calcule comissões de vendas e aluguéis com divisão entre corretores
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="transaction-type">Tipo de Transação</Label>
            <Select value={transactionType} onValueChange={(value) => handleTypeChange(value as 'sale' | 'rental')}>
              <SelectTrigger id="transaction-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sale">Venda</SelectItem>
                <SelectItem value="rental">Locação</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="transaction-value">
              {transactionType === 'sale' ? 'Valor da Venda' : 'Valor do Aluguel (mensal)'}
            </Label>
            <Input
              id="transaction-value"
              type="number"
              placeholder="R$ 0,00"
              value={transactionValue}
              onChange={(e) => setTransactionValue(e.target.value)}
              step="0.01"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="commission-rate">
              Taxa de Comissão (%)
              {transactionType === 'rental' && (
                <span className="ml-2 text-xs text-muted-foreground">
                  (padrão: 100% do primeiro mês)
                </span>
              )}
            </Label>
            <Input
              id="commission-rate"
              type="number"
              placeholder="6"
              value={commissionRate}
              onChange={(e) => setCommissionRate(e.target.value)}
              step="0.1"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="agency-split">Divisão Corretor (% da comissão)</Label>
            <Input
              id="agency-split"
              type="number"
              placeholder="50"
              value={agencySplit}
              onChange={(e) => setAgencySplit(e.target.value)}
              step="1"
              min="0"
              max="100"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="num-brokers">Número de Corretores</Label>
            <Select value={numberOfBrokers} onValueChange={setNumberOfBrokers}>
              <SelectTrigger id="num-brokers">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 Corretor</SelectItem>
                <SelectItem value="2">2 Corretores</SelectItem>
                <SelectItem value="3">3 Corretores</SelectItem>
                <SelectItem value="4">4 Corretores</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Resultado do Cálculo
          </CardTitle>
          <CardDescription>
            Valores calculados com base nos parâmetros informados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Gross Commission */}
          <div className="p-4 rounded-xl border bg-blue-50 dark:bg-blue-950/20">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Comissão Bruta
              </span>
              <span className="text-xs text-blue-700 dark:text-blue-300">
                {formatPercent(parseFloat(commissionRate) || 0)}
              </span>
            </div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {formatCurrency(result.grossCommission)}
            </div>
          </div>

          {/* Agency Share */}
          <div className="p-4 rounded-xl border bg-purple-50 dark:bg-purple-950/20">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-purple-900 dark:text-purple-100">
                Parte da Imobiliária
              </span>
              <span className="text-xs text-purple-700 dark:text-purple-300">
                {formatPercent(100 - (parseFloat(agencySplit) || 0))}
              </span>
            </div>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {formatCurrency(result.agencyShare)}
            </div>
          </div>

          {/* Broker Total Share */}
          <div className="p-4 rounded-xl border bg-green-50 dark:bg-green-950/20">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-green-900 dark:text-green-100">
                Total dos Corretores
              </span>
              <span className="text-xs text-green-700 dark:text-green-300">
                {formatPercent(parseFloat(agencySplit) || 0)}
              </span>
            </div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(result.brokerTotalShare)}
            </div>
          </div>

          {/* Per Broker Share (if multiple brokers) */}
          {result.brokers > 1 && (
            <div className="p-4 rounded-xl border bg-amber-50 dark:bg-amber-950/20">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-amber-900 dark:text-amber-100">
                  Por Corretor
                </span>
                <span className="text-xs text-amber-700 dark:text-amber-300">
                  {result.brokers} corretores
                </span>
              </div>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {formatCurrency(result.perBrokerShare)}
              </div>
            </div>
          )}

          {/* Visual Breakdown */}
          <div className="pt-4 border-t">
            <div className="flex items-center gap-2 mb-3">
              <PieChart className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Divisão Visual</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div
                  className="h-3 rounded-full bg-green-500"
                  style={{ width: `${agencySplit}%` }}
                />
                <span className="text-xs text-muted-foreground min-w-[60px]">
                  {formatPercent(parseFloat(agencySplit) || 0)} Corretor(es)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="h-3 rounded-full bg-purple-500"
                  style={{ width: `${100 - (parseFloat(agencySplit) || 0)}%` }}
                />
                <span className="text-xs text-muted-foreground min-w-[60px]">
                  {formatPercent(100 - (parseFloat(agencySplit) || 0))} Imobiliária
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
