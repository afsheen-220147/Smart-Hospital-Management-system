const fs = require('fs');
const path = require('path');

const targetDir = path.join(process.cwd(), 'testing_lab_reports');

if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir);
}

const createPDF = (name, sizeMB) => {
    const filePath = path.join(targetDir, name);
    const sizeBytes = sizeMB * 1024 * 1024;
    
    // Minimal valid PDF header
    const header = `%PDF-1.4\n1 0 obj\n<< /Title (${name}) >>\nendobj\nstream\n`;
    const footer = `\nendstream\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF`;
    
    const buffer = Buffer.alloc(sizeBytes);
    buffer.write(header, 0);
    
    // Fill with some dummy character to ensure it's not a sparse file
    for (let i = header.length; i < sizeBytes - footer.length; i++) {
        buffer[i] = 65; // 'A'
    }
    
    buffer.write(footer, sizeBytes - footer.length);
    
    fs.writeFileSync(filePath, buffer);
    console.log(`Created: ${name} (${(fs.statSync(filePath).size / (1024 * 1024)).toFixed(2)} MB)`);
};

console.log(`Generating files in: ${targetDir}\n`);
createPDF('Lab_Report_BloodTest.pdf', 4);
createPDF('Lab_Report_Radiology.pdf', 4);
createPDF('Lab_Report_Cardiology.pdf', 4);
