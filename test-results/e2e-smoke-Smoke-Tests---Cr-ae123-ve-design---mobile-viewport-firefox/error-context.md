# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e5]:
    - generic [ref=e6]:
      - img [ref=e8]
      - generic [ref=e14]: ImobiBase
    - generic [ref=e15]:
      - heading "Bem-vindo de volta" [level=2] [ref=e16]
      - paragraph [ref=e17]: Entre com suas credenciais para acessar o painel
    - generic [ref=e18]:
      - generic [ref=e19]:
        - text: Email
        - textbox "Email" [ref=e20]:
          - /placeholder: seu@email.com
          - text: admin@demo.com
      - generic [ref=e21]:
        - generic [ref=e22]:
          - generic [ref=e23]: Senha
          - link "Esqueceu?" [ref=e24] [cursor=pointer]:
            - /url: "#"
        - textbox "Senha" [ref=e25]: demo123
      - button "Entrar" [ref=e26] [cursor=pointer]
    - generic [ref=e31]: ou
    - paragraph [ref=e32]:
      - text: Não tem uma conta?
      - link "Criar conta grátis" [ref=e33] [cursor=pointer]:
        - /url: "#"
  - region "Notifications alt+T"
```