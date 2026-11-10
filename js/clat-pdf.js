/* Print-ready CLAT paper export. Uses the browser's native Print -> Save as PDF flow. */
(function(root){
  "use strict";
  const SECTION_ORDER=[
    ["english","English Language"],
    ["current-affairs","Current Affairs & General Knowledge"],
    ["legal","Legal Reasoning"],
    ["logical","Logical Reasoning"],
    ["quantitative","Quantitative Techniques"]
  ];
  const escapeHtml=value=>String(value??"").replace(/[&<>"']/g,char=>({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[char]));
  const slug=value=>String(value||"clat-practice-paper").toLowerCase()
    .replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,70)||"clat-practice-paper";
  const letter=index=>String.fromCharCode(65+index);

  function buildAnswerSheet(total){
    const rows=[];
    for(let start=0;start<total;start+=3){
      const cells=[];
      for(let slot=0;slot<3;slot++){
        const number=start+slot+1;
        if(number>total){
          cells.push('<td class="qno"></td><td colspan="4"></td>');
          continue;
        }
        cells.push('<td class="qno">'+number+'</td>');
        for(let option=0;option<4;option++){
          cells.push('<td class="bubble">'+letter(option)+' <span>○</span></td>');
        }
      }
      rows.push("<tr>"+cells.join("")+"</tr>");
    }
    const head=[];
    for(let slot=0;slot<3;slot++)head.push("<th>Q</th><th>A</th><th>B</th><th>C</th><th>D</th>");
    return '<section class="answer-sheet"><h2>Answer Recording Sheet</h2>'+
      '<p class="muted">Mark one option for each question. This sheet is blank; answers are not included in the question paper.</p>'+
      '<table class="answer-grid"><thead><tr>'+head.join("")+'</tr></thead><tbody>'+rows.join("")+'</tbody></table></section>';
  }

  function buildHtml(paper){
    if(!paper||!Array.isArray(paper.passages)||!Array.isArray(paper.questions)||!paper.questions.length){
      throw new Error("This paper is not available for PDF export.");
    }
    const paperTitle=escapeHtml(paper.title||"CLAT UG 2027 Practice Paper");
    const fileName=slug(paper.paperId||paper.title)+".pdf";
    const duration=Number(paper.durationMinutes)||120;
    const total=paper.questions.length;
    const maxMarks=total;
    const passagesHtml=SECTION_ORDER.map(([sectionId,sectionTitle],sectionIndex)=>{
      const passages=paper.passages.filter(passage=>passage.sectionId===sectionId);
      if(!passages.length)return "";
      const sectionQuestions=paper.questions.filter(question=>question.sectionId===sectionId).length;
      const passageBlocks=passages.map(passage=>{
        const attached=paper.questions.map((question,index)=>({question,index}))
          .filter(item=>item.question.passageId===passage.passageId);
        if(!attached.length)return "";
        const questionHtml=attached.map(({question,index})=>{
          const options=(question.options||[]).map((option,optionIndex)=>
            '<li><span class="option-letter">'+letter(optionIndex)+'.</span><span>'+escapeHtml(option.text)+'</span></li>'
          ).join("");
          return '<article class="question"><p class="question-stem"><strong>Q'+(index+1)+'.</strong> '+escapeHtml(question.prompt)+'</p>'+
            '<ol class="options">'+options+'</ol></article>';
        }).join("");
        return '<div class="passage-block"><div class="passage-title">'+escapeHtml(passage.title)+'</div>'+
          '<div class="passage-text">'+escapeHtml(passage.text)+'</div>'+questionHtml+'</div>';
      }).join("");
      return '<section class="section-block'+(sectionIndex===0?" first-section":"")+'">'+
        '<div class="section-heading"><h2>'+sectionTitle+'</h2><span>'+sectionQuestions+' Questions</span></div>'+
        passageBlocks+'</section>';
    }).join("");

    return '<!doctype html><html lang="en"><head><meta charset="utf-8">'+
      '<meta name="viewport" content="width=device-width,initial-scale=1">'+
      '<title>'+fileName+'</title><style>'+
      '@page{size:A4;margin:14mm 14mm 16mm}'+
      '*{box-sizing:border-box}body{margin:0;color:#1d2340;font-family:Arial,Helvetica,sans-serif;font-size:10.5pt;line-height:1.48;background:#fff}'+
      '.sheet{max-width:900px;margin:24px auto;padding:0 24px 30px}.masthead{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #403b8c;padding-bottom:10px;margin-bottom:18px}.brand{font-weight:900;letter-spacing:.13em;color:#403b8c;font-size:9pt}.series{color:#626b84;font-size:8.5pt;text-align:right}'+
      '.title{margin:0 0 5px;font-size:24pt;line-height:1.14;color:#20234b}.subtitle{margin:0 0 15px;color:#5d6480;font-size:10pt}.meta{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:15px 0}.meta div{border:1px solid #dfe2ed;border-radius:7px;padding:8px}.meta b{display:block;font-size:8pt;color:#69718b;text-transform:uppercase;letter-spacing:.05em}.meta span{display:block;font-size:11pt;font-weight:800;margin-top:2px}'+
      '.candidate{display:grid;grid-template-columns:2fr 1fr 1fr;gap:15px;margin:14px 0}.line{border-bottom:1px solid #7c8298;min-height:24px;font-size:8.5pt;color:#626b84}.instructions{border:1px solid #dfe2ed;background:#f7f7fb;padding:11px 14px;border-radius:8px;margin:15px 0 20px}.instructions h2{font-size:11pt;margin:0 0 5px}.instructions ul{margin:4px 0 0;padding-left:18px}.instructions li{margin:2px 0}'+
      '.section-block{break-before:page;page-break-before:always}.first-section{break-before:auto;page-break-before:auto}.section-heading{display:flex;justify-content:space-between;align-items:baseline;border-bottom:2px solid #403b8c;padding-bottom:6px;margin:0 0 15px}.section-heading h2{font-size:16pt;color:#302c70;margin:0}.section-heading span{font-size:8.5pt;font-weight:700;color:#626b84}'+
      '.passage-block{margin:0 0 18px}.passage-title{font-weight:800;font-size:11pt;color:#30316a;margin:0 0 7px;break-after:avoid}.passage-text{white-space:pre-wrap;text-align:justify;background:#f8f8fc;border-left:3px solid #c8c3e8;padding:10px 12px;margin:0 0 10px;font-size:9.7pt;line-height:1.55;break-inside:avoid}.question{margin:10px 0 13px;break-inside:avoid;page-break-inside:avoid}.question-stem{margin:0 0 5px;font-size:10pt}.options{list-style:none;counter-reset:option;margin:0;padding:0 0 0 17px;display:grid;grid-template-columns:1fr 1fr;gap:4px 16px}.options li{display:flex;gap:5px;align-items:flex-start;font-size:9.6pt}.option-letter{font-weight:800;min-width:16px;color:#403b8c}'+
      '.answer-sheet{break-before:page;page-break-before:always}.answer-sheet h2{font-size:17pt;color:#302c70;margin:0 0 4px}.muted{font-size:8.5pt;color:#626b84;margin:0 0 12px}.answer-grid{width:100%;border-collapse:collapse;table-layout:fixed;font-size:7.5pt}.answer-grid th,.answer-grid td{border:1px solid #d8dbea;text-align:center;padding:3px 1px;height:18px}.answer-grid th{background:#efedf9;color:#403b8c;font-weight:800}.answer-grid .qno{font-weight:800;background:#fafaff}.answer-grid .bubble{color:#313654}.answer-grid .bubble span{font-size:10pt;color:#777d90}'+
      '.print-hint{margin:20px auto;max-width:850px;padding:11px 14px;background:#fff8df;border:1px solid #efd98b;border-radius:8px;color:#594b22;font-size:9pt}.pdf-footer{margin-top:20px;padding-top:8px;border-top:1px solid #e0e2ec;color:#737991;text-align:center;font-size:8pt}'+
      '@media print{body{font-size:10pt}.sheet{max-width:none;margin:0;padding:0}.print-hint{display:none}.pdf-footer{position:fixed;bottom:-10mm;left:0;right:0;margin:0;padding-top:4px;background:#fff}.passage-text{background:#fff}.instructions{background:#fff}}'+
      '@media screen and (max-width:700px){.sheet{margin:12px auto;padding:0 12px}.meta{grid-template-columns:1fr 1fr}.candidate{grid-template-columns:1fr}.options{grid-template-columns:1fr}}'+
      '</style></head><body><div class="print-hint">In the print window, choose <strong>Save as PDF</strong> as the destination to download this paper as a PDF. The document contains questions only, with no answer key or explanations.</div>'+
      '<main class="sheet"><header class="masthead"><div class="brand">AI-ENTHUSIAST</div><div class="series">CLAT UG 2027<br>Practice Series</div></header>'+
      '<h1 class="title">'+paperTitle+'</h1><p class="subtitle">Independent full-length practice pilot · Not an official Consortium of NLUs paper</p>'+
      '<div class="meta"><div><b>Questions</b><span>'+total+'</span></div><div><b>Duration</b><span>'+duration+' minutes</span></div><div><b>Maximum marks</b><span>'+maxMarks+'</span></div><div><b>Marking</b><span>+1 / −0.25</span></div></div>'+
      '<div class="candidate"><div class="line">Candidate name:</div><div class="line">Roll number:</div><div class="line">Date:</div></div>'+
      '<section class="instructions"><h2>Instructions</h2><ul><li>Read each passage carefully and answer the questions that follow.</li><li>Select one option only for each question.</li><li>Each correct answer carries 1 mark; each incorrect answer attracts a penalty of 0.25 mark.</li><li>Unanswered questions receive zero marks.</li><li>Suggested examination time: '+duration+' minutes. Use the answer recording sheet at the end if required.</li></ul></section>'+
      passagesHtml+buildAnswerSheet(total)+
      '<div class="pdf-footer">AI-Enthusiast · CLAT UG 2027 Independent Practice · Not an official Consortium paper · '+escapeHtml(paper.paperId||"")+'</div></main></body></html>';
  }

  function buildAnswerKeyHtml(paper){
    if(!paper||!Array.isArray(paper.passages)||!Array.isArray(paper.questions)||!paper.questions.length){
      throw new Error("This paper is not available for answer-key export.");
    }
    const paperTitle=escapeHtml(paper.title||"CLAT UG 2027 Practice Paper");
    const fileName=slug(paper.paperId||paper.title)+"-answer-key.pdf";
    const sectionsHtml=SECTION_ORDER.map(([sectionId,sectionTitle],sectionIndex)=>{
      const passages=paper.passages.filter(passage=>passage.sectionId===sectionId);
      if(!passages.length)return "";
      const passageBlocks=passages.map(passage=>{
        const attached=paper.questions.map((question,index)=>({question,index}))
          .filter(item=>item.question.passageId===passage.passageId);
        if(!attached.length)return "";
        const questionsHtml=attached.map(({question,index})=>{
          const correctIndex=(question.options||[]).findIndex(option=>option.optionId===question.correctOptionId);
          if(correctIndex<0)throw new Error("Missing correct answer for question "+(index+1)+".");
          const correctOption=question.options[correctIndex];
          return '<article class="key-question">'+
            '<div class="question-heading"><strong>Q'+(index+1)+'.</strong> '+escapeHtml(question.prompt)+'</div>'+
            '<p class="key-answer"><span class="answer-label">Correct answer</span><strong>'+letter(correctIndex)+'. '+escapeHtml(correctOption.text)+'</strong></p>'+
            '<p class="explanation"><span class="answer-label">Explanation</span>'+escapeHtml(question.explanation||"No explanation provided.")+'</p>'+
            '</article>';
        }).join("");
        return '<div class="passage-block"><h3>'+escapeHtml(passage.title)+'</h3>'+questionsHtml+'</div>';
      }).join("");
      return '<section class="section-block'+(sectionIndex===0?" first-section":"")+'">'+
        '<div class="section-heading"><h2>'+sectionTitle+'</h2>'+
        '<span>'+paper.questions.filter(question=>question.sectionId===sectionId).length+' Questions</span></div>'+
        passageBlocks+'</section>';
    }).join("");

    return '<!doctype html><html lang="en"><head><meta charset="utf-8">'+
      '<meta name="viewport" content="width=device-width,initial-scale=1">'+
      '<title>'+fileName+'</title><style>'+
      '@page{size:A4;margin:14mm 14mm 16mm}'+
      '*{box-sizing:border-box}body{margin:0;color:#202541;font-family:Arial,Helvetica,sans-serif;font-size:10pt;line-height:1.5;background:#fff}'+
      '.sheet{max-width:900px;margin:24px auto;padding:0 24px 30px}.masthead{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #403b8c;padding-bottom:10px;margin-bottom:18px}.brand{font-weight:900;letter-spacing:.13em;color:#403b8c;font-size:9pt}.series{color:#626b84;font-size:8.5pt;text-align:right}'+
      '.title{margin:0 0 5px;font-size:23pt;line-height:1.15;color:#20234b}.subtitle{margin:0 0 15px;color:#5d6480;font-size:10pt}.meta{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:15px 0}.meta div{border:1px solid #dfe2ed;border-radius:7px;padding:8px}.meta b{display:block;font-size:8pt;color:#69718b;text-transform:uppercase;letter-spacing:.05em}.meta span{display:block;font-size:10pt;font-weight:800;margin-top:2px}'+
      '.notice{border:1px solid #d9d5ee;background:#f7f6fc;border-radius:8px;padding:10px 12px;margin:14px 0 20px;color:#4d4a78;font-size:9pt}.section-block{break-before:page;page-break-before:always}.first-section{break-before:auto;page-break-before:auto}.section-heading{display:flex;justify-content:space-between;align-items:baseline;border-bottom:2px solid #403b8c;padding-bottom:6px;margin:0 0 12px}.section-heading h2{font-size:15pt;color:#302c70;margin:0}.section-heading span{font-size:8.5pt;font-weight:700;color:#626b84}'+
      '.passage-block{margin:0 0 16px}.passage-block>h3{font-size:10pt;color:#615a99;margin:0 0 8px;padding:6px 8px;background:#f6f5fb;border-left:3px solid #c8c3e8;break-after:avoid}.key-question{margin:0 0 13px;padding:0 0 11px;border-bottom:1px solid #e7e8ef;break-inside:avoid;page-break-inside:avoid}.question-heading{font-size:9.8pt;font-weight:700;margin-bottom:6px}.question-heading strong{color:#403b8c}.answer-label{display:block;font-size:7.5pt;text-transform:uppercase;letter-spacing:.06em;font-weight:900;color:#727891;margin-bottom:2px}.key-answer{margin:5px 0 6px;padding:7px 9px;border:1px solid #cfe3d5;border-radius:6px;background:#f3faf5;color:#234832}.key-answer strong{font-size:9.5pt}.explanation{margin:0;padding:0 0 0 9px;border-left:2px solid #d8d5ec;color:#505873;font-size:9pt;line-height:1.5}'+
      '.print-hint{margin:20px auto;max-width:850px;padding:11px 14px;background:#fff8df;border:1px solid #efd98b;border-radius:8px;color:#594b22;font-size:9pt}.pdf-footer{margin-top:20px;padding-top:8px;border-top:1px solid #e0e2ec;color:#737991;text-align:center;font-size:8pt}'+
      '@media print{body{font-size:9.5pt}.sheet{max-width:none;margin:0;padding:0}.print-hint{display:none}.pdf-footer{position:fixed;bottom:-10mm;left:0;right:0;margin:0;padding-top:4px;background:#fff}}'+
      '@media screen and (max-width:700px){.sheet{margin:12px auto;padding:0 12px}.meta{grid-template-columns:1fr 1fr}}'+
      '</style></head><body><div class="print-hint">In the print window, choose <strong>Save as PDF</strong> to download this answer key. Each entry shows the correct displayed option and its explanation.</div>'+
      '<main class="sheet"><header class="masthead"><div class="brand">AI-ENTHUSIAST</div><div class="series">CLAT UG 2027<br>Practice Series</div></header>'+
      '<h1 class="title">'+paperTitle+' · Answer Key</h1><p class="subtitle">Answer key and explanations · Independent practice pilot · Not an official Consortium of NLUs paper</p>'+
      '<div class="meta"><div><b>Questions</b><span>'+paper.questions.length+'</span></div><div><b>Duration</b><span>'+(Number(paper.durationMinutes)||120)+' minutes</span></div><div><b>Marking</b><span>+1 / −0.25</span></div></div>'+
      '<div class="notice"><strong>How to use this key:</strong> The letter (A–D) refers to the option as displayed in the question paper. Read the explanation to understand why that option is correct.</div>'+
      sectionsHtml+
      '<div class="pdf-footer">AI-Enthusiast · CLAT UG 2027 Independent Practice · Answer Key · Not an official Consortium paper · '+escapeHtml(paper.paperId||"")+'</div></main></body></html>';
  }

  function openPrintView(html){
    const printWindow=root.open("","_blank");
    if(!printWindow)return {opened:false,message:"Your browser blocked the PDF window. Allow pop-ups for this site and try again."};
    try{
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
      root.setTimeout(()=>{
        try{printWindow.focus();printWindow.print();}
        catch(_){return;}
      },450);
      return {opened:true,message:"PDF preview opened. Choose Save as PDF in the print destination."};
    }catch(error){
      try{printWindow.close();}catch(_){}
      return {opened:false,message:"Unable to prepare the PDF: "+(error&&error.message||"unknown error")};
    }
  }

  function printPaper(paper){return openPrintView(buildHtml(paper));}
  function printAnswerKey(paper){return openPrintView(buildAnswerKeyHtml(paper));}

  const api={buildHtml,printPaper,buildAnswerKeyHtml,printAnswerKey};
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  root.C10ClatPdf=api;
})(typeof window!=="undefined"?window:globalThis);
