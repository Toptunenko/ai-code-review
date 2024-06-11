rm -rf dist
npx tsc
cd dist
zip -r ../lambda.zip .
cd ..
zip -r lambda.zip node_modules
