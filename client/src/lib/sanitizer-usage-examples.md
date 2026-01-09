# Exemplos de Uso da Sanitização XSS

Este documento mostra como usar as funções de sanitização para proteger contra XSS.

## 1. Sanitizar HTML de Usuários

### Usando o componente SafeHTML (Recomendado)

```tsx
import { SafeHTML } from '@/components/SafeHTML';

function UserProfile({ bio }: { bio: string }) {
  // Bio pode conter HTML malicioso de usuários
  return (
    <div>
      <h2>Sobre mim</h2>
      <SafeHTML
        html={bio}
        className="prose"
        allowedTags={['p', 'strong', 'em', 'a', 'br']}
      />
    </div>
  );
}
```

### Usando a função sanitizeHtml diretamente

```tsx
import { sanitizeHtml } from '@/lib/sanitizer';

function CommentDisplay({ comment }: { comment: string }) {
  const safeComment = sanitizeHtml(comment);

  return (
    <div dangerouslySetInnerHTML={{ __html: safeComment }} />
  );
}
```

## 2. Sanitizar CSS Dinâmico

```tsx
import { sanitizeCss } from '@/lib/sanitizer';

function DynamicColor({ userColor }: { userColor: string }) {
  // Usuário pode tentar injetar CSS malicioso
  const safeColor = sanitizeCss(userColor);

  return (
    <div style={{ backgroundColor: safeColor }}>
      Conteúdo
    </div>
  );
}
```

## 3. Validar URLs de Usuários

### Usando o componente SafeLink

```tsx
import { SafeLink } from '@/components/SafeHTML';

function UserLinks({ url, text }: { url: string; text: string }) {
  return (
    <SafeLink href={url} target="_blank">
      {text}
    </SafeLink>
  );
}
```

### Usando as funções de validação

```tsx
import { isSafeUrl, sanitizeUrl } from '@/lib/sanitizer';

function ExternalLink({ url }: { url: string }) {
  if (!isSafeUrl(url)) {
    return <span className="text-red-500">URL inválida</span>;
  }

  return (
    <a href={sanitizeUrl(url)} target="_blank" rel="noopener noreferrer">
      Link externo
    </a>
  );
}
```

## 4. Sanitizar Atributos HTML

```tsx
import { sanitizeAttribute } from '@/lib/sanitizer';

function UserTitle({ title }: { title: string }) {
  // Title pode conter caracteres perigosos
  const safeTitle = sanitizeAttribute(title);

  return <div title={safeTitle}>Conteúdo</div>;
}
```

## 5. Uso em Relatórios (já implementado)

```tsx
import { sanitizeHtml } from '@/lib/sanitizer';
import { printDocument } from '@/lib/report-generators';

// A função printDocument agora sanitiza automaticamente
// antes de criar o documento de impressão
printDocument('report-container');
```

## 6. Uso em Charts (já implementado)

```tsx
import { ChartContainer } from '@/components/ui/chart';

// As cores dos charts são automaticamente sanitizadas
const chartConfig = {
  sales: {
    label: "Vendas",
    color: userProvidedColor, // Será sanitizado automaticamente
  }
};
```

## Vetores de XSS Bloqueados

### ✅ Scripts inline
```tsx
// ❌ ANTES (Vulnerável):
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// ✅ DEPOIS (Seguro):
<SafeHTML html={userInput} />
```

### ✅ Event Handlers
```tsx
// Bloqueado:
<img src="x" onerror="alert('XSS')" />
// Resultado: <img src="x" />
```

### ✅ JavaScript URLs
```tsx
// Bloqueado:
<a href="javascript:alert('XSS')">Click</a>
// Resultado: <a href="#">Click</a>
```

### ✅ Data URLs
```tsx
// Bloqueado:
<a href="data:text/html,<script>alert('XSS')</script>">Click</a>
// Resultado: <a href="#">Click</a>
```

### ✅ CSS Injection
```tsx
// Bloqueado:
style="background: url(javascript:alert('XSS'))"
// Resultado: style="background: "
```

### ✅ Iframes e Objects
```tsx
// Bloqueado:
<iframe src="evil.com"></iframe>
<object data="evil.swf"></object>
// Resultado: (removidos completamente)
```

## Boas Práticas

1. **Sempre sanitize input de usuários**
   - Comentários
   - Biografias
   - Descrições de produtos
   - Qualquer conteúdo editável

2. **Use o componente SafeHTML quando possível**
   - Mais legível
   - Type-safe
   - Consistente

3. **Customize allowedTags conforme necessário**
   ```tsx
   // Para comentários simples
   <SafeHTML
     html={comment}
     allowedTags={['p', 'br', 'strong', 'em']}
   />

   // Para conteúdo rico
   <SafeHTML
     html={article}
     allowedTags={['p', 'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'strong', 'em', 'a']}
   />
   ```

4. **Valide URLs antes de usar**
   ```tsx
   if (!isSafeUrl(url)) {
     // Mostre erro ou use fallback
     return <span>URL inválida</span>;
   }
   ```

5. **Nunca confie em input de usuários**
   - Mesmo que venha do backend
   - Mesmo que venha de APIs externas
   - Sempre sanitize antes de renderizar

## Testes

Execute os testes de sanitização:

```bash
npm run test -- client/src/lib/__tests__/sanitizer.test.ts
```

Todos os 33 testes devem passar:
- ✅ Bloqueio de tags `<script>`
- ✅ Bloqueio de event handlers
- ✅ Bloqueio de `<iframe>` e `<object>`
- ✅ Validação de URLs
- ✅ Sanitização de CSS
- ✅ Escape de atributos HTML
- ✅ Vetores de XSS avançados

## Referências

- [DOMPurify Documentation](https://github.com/cure53/DOMPurify)
- [OWASP XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
