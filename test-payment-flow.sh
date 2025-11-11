#!/bin/bash
# Script para probar el flujo de pagos completo

API_URL="http://localhost:4000"
ADMIN_EMAIL="aterrazea@gmail.com"
ADMIN_PASSWORD="admin123"

echo "🔐 1. Iniciando sesión como admin..."
LOGIN_RESPONSE=$(curl -s -c /tmp/cookies.txt -X POST "$API_URL/api/auth/login/email-password" \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:5173" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")

echo "Login response: $LOGIN_RESPONSE"

# Extraer project_id de la base de datos o usar uno conocido
PROJECT_ID="03dbca1c-5947-4f3e-90bf-5f40f293f53d"  # Del proyecto que obtuvimos antes

echo ""
echo "💰 2. Creando pago borrador..."
PAYMENT_RESPONSE=$(curl -s -b /tmp/cookies.txt -X POST "$API_URL/api/admin/payments" \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:5173" \
  -d "{
    \"projectId\": \"$PROJECT_ID\",
    \"concept\": \"Pago de prueba - Terraza Mediterránea\",
    \"description\": \"Pago de prueba para verificar integración Stripe\",
    \"amount\": 1500.50,
    \"currency\": \"EUR\"
  }")

echo "Payment created: $PAYMENT_RESPONSE"

# Extraer payment ID de la respuesta
PAYMENT_ID=$(echo "$PAYMENT_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$PAYMENT_ID" ]; then
  echo "❌ Error: No se pudo obtener el ID del pago"
  exit 1
fi

echo ""
echo "📧 3. Enviando pago (creando checkout session)..."
SEND_RESPONSE=$(curl -s -b /tmp/cookies.txt -X POST "$API_URL/api/admin/payments/$PAYMENT_ID/send" \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:5173")

echo "Send response: $SEND_RESPONSE"

# Verificar que tiene payment_link y status pending
if echo "$SEND_RESPONSE" | grep -q '"status":"pending"'; then
  echo "✅ Pago enviado correctamente, status: pending"
else
  echo "⚠️  Status no es pending"
fi

if echo "$SEND_RESPONSE" | grep -q '"payment_link"'; then
  PAYMENT_LINK=$(echo "$SEND_RESPONSE" | grep -o '"payment_link":"[^"]*"' | cut -d'"' -f4)
  echo "✅ Payment link generado: $PAYMENT_LINK"
  echo ""
  echo "🔗 Puedes probar el checkout en: $PAYMENT_LINK"
else
  echo "❌ No se generó payment_link"
fi

rm -f /tmp/cookies.txt

