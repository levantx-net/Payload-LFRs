const fs = require('fs');

let code = fs.readFileSync('src/components/LfrsShare.tsx', 'utf8');

// Fix the import
code = code.replace(/import styles from '\.\/styles\/lfrs\.module\.css'/g, "import classes from './styles/lfrs.module.css'");

// Fix the shadowing of the styles object from props
code = code.replace(/styles\./g, 'classes.');

// Fix classNames usage
code = code.replace(/containerClassName/g, 'classNames?.container');
code = code.replace(/containerStyle/g, 'styles?.container');
code = code.replace(/panelClassName/g, 'classNames?.panel');
code = code.replace(/panelStyle/g, 'styles?.panel');
code = code.replace(/buttonClassName/g, 'classNames?.button');
code = code.replace(/buttonStyle/g, 'styles?.button');
code = code.replace(/platformButtonClassName/g, 'classNames?.platformButton');
code = code.replace(/platformButtonStyle/g, 'styles?.platformButton');
code = code.replace(/copyRowClassName/g, 'classNames?.copyRow');
code = code.replace(/copyRowStyle/g, 'styles?.copyRow');
code = code.replace(/copyButtonClassName/g, 'classNames?.copyButton');
code = code.replace(/copyButtonStyle/g, 'styles?.copyButton');

fs.writeFileSync('src/components/LfrsShare.tsx', code);
console.log('Refactored LfrsShare.tsx');
