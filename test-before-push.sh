#!/bin/bash

echo "🧪 Testing before push..."
echo

# Test 1: Flow type checking
echo "1️⃣ Running Flow type check..."
if npm run flow:check; then
    echo "✅ Flow check passed"
else
    echo "❌ Flow check failed"
    exit 1
fi
echo

# Test 2: ESLint
echo "2️⃣ Running ESLint..."
if npm run lint; then
    echo "✅ ESLint passed"
else
    echo "❌ ESLint failed"
    exit 1
fi
echo

# Test 3: Run tests
echo "3️⃣ Running tests..."
if npm test; then
    echo "✅ Tests passed"
else
    echo "❌ Tests failed"
    exit 1
fi
echo

echo "🎉 All checks passed! Safe to push!"
echo
echo "📝 Summary:"
echo "  - Flow type checking: ✅"
echo "  - ESLint: ✅"
echo "  - Tests: ✅"