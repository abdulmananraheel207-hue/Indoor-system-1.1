// test-routes.js
const app = require('./app'); // Your app.js file

console.log("🔍 Checking Mounted Routes:\n");

function printRoutes(layer, prefix = '') {
    if (layer.route) {
        // Regular route
        const methods = Object.keys(layer.route.methods).join(', ').toUpperCase();
        console.log(`  ${methods.padEnd(10)} ${prefix}${layer.route.path}`);
    } else if (layer.name === 'router' && layer.handle.stack) {
        // Router middleware
        const routerPath = layer.regexp.toString()
            .replace('/^', '')
            .replace('\\/?(?=\\/|$)/i', '')
            .replace(/\\\//g, '/');

        layer.handle.stack.forEach(handler => {
            printRoutes(handler, routerPath);
        });
    }
}

app._router.stack.forEach(layer => {
    printRoutes(layer);
});

console.log("\n" + "=".repeat(60));
console.log("📋 Check for duplicate '/api/owners' mounts above");
console.log("=".repeat(60));