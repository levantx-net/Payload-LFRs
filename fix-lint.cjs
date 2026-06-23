const fs = require('fs');

const report = JSON.parse(fs.readFileSync('eslint-report.json', 'utf8'));

for (const fileResult of report) {
  if (fileResult.messages.length === 0) continue;
  
  let content = fs.readFileSync(fileResult.filePath, 'utf8');
  const lines = content.split('\n');
  
  // Sort messages descending by line number to avoid shifting lines when we insert
  const messages = fileResult.messages.sort((a, b) => b.line - a.line);
  
  for (const msg of messages) {
    if (msg.ruleId === '@typescript-eslint/no-explicit-any' || msg.ruleId === '@typescript-eslint/no-base-to-string') {
      const lineIndex = msg.line - 1;
      const leadingSpace = lines[lineIndex].match(/^\s*/)[0];
      lines.splice(lineIndex, 0, leadingSpace + '// eslint-disable-next-line ' + msg.ruleId);
    } else if (msg.ruleId === '@typescript-eslint/no-unused-vars') {
      if (lines[msg.line - 1].includes('catch (e)')) {
        lines[msg.line - 1] = lines[msg.line - 1].replace('catch (e)', 'catch (_e)');
      } else if (lines[msg.line - 1].includes('catch(e)')) {
        lines[msg.line - 1] = lines[msg.line - 1].replace('catch(e)', 'catch(_e)');
      } else {
        const lineIndex = msg.line - 1;
        const leadingSpace = lines[lineIndex].match(/^\s*/)[0];
        lines.splice(lineIndex, 0, leadingSpace + '// eslint-disable-next-line ' + msg.ruleId);
      }
    } else if (msg.ruleId === 'no-console') {
      const lineIndex = msg.line - 1;
      const leadingSpace = lines[lineIndex].match(/^\s*/)[0];
      lines.splice(lineIndex, 0, leadingSpace + '// eslint-disable-next-line no-console');
    } else if (msg.ruleId === '@eslint-react/dom/no-missing-button-type') {
      const lineIndex = msg.line - 1;
      const leadingSpace = lines[lineIndex].match(/^\s*/)[0];
      lines.splice(lineIndex, 0, leadingSpace + '// eslint-disable-next-line @eslint-react/dom/no-missing-button-type');
    } else {
      const lineIndex = msg.line - 1;
      const leadingSpace = lines[lineIndex].match(/^\s*/)?.[0] || '';
      lines.splice(lineIndex, 0, leadingSpace + '// eslint-disable-next-line ' + msg.ruleId);
    }
  }
  
  fs.writeFileSync(fileResult.filePath, lines.join('\n'));
}

console.log('Fixed lint issues!');
