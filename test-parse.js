class TextNode {
  constructor(text) {
    this.text = text;
    this.parent = null;
  }
  getTextContent() { return this.text; }
  splitText(offset) {
    const left = new TextNode(this.text.substring(0, offset));
    const right = new TextNode(this.text.substring(offset));
    left.parent = this.parent;
    right.parent = this.parent;
    this.text = left.text; // mutate self? Wait, lexical mutates self, but let's just return new nodes
    // Actually lexical splitText mutates the original node to be the left part, and returns both
    return [this, right];
  }
  insertBefore(node) {
    console.log(`Inserted ${node.type} before "${this.text}"`);
  }
}
class KeywordNode {
  constructor() { this.type = 'KeywordNode'; this.children = []; }
  append(node) {
    this.children.push(node);
    console.log(`Appended "${node.text}" to KeywordNode`);
  }
}

let textNodes = [new TextNode("Ace killed Hero today, Ace!")];
const regex = new RegExp(`\\b(Ace|Hero)\\b`, 'i');

for (let i = 0; i < textNodes.length; i++) {
  let textNode = textNodes[i];
  let match;
  while ((match = regex.exec(textNode.getTextContent())) !== null) {
    const matchedText = match[0];
    const startIndex = match.index;
    let targetNode = textNode;
    
    if (startIndex > 0) {
      [, targetNode] = targetNode.splitText(startIndex);
    }
    
    if (targetNode.getTextContent().length > matchedText.length) {
      [targetNode, textNode] = targetNode.splitText(matchedText.length);
      regex.lastIndex = 0;
    } else {
      match = null;
    }
    
    const keywordNode = new KeywordNode();
    targetNode.insertBefore(keywordNode);
    keywordNode.append(targetNode);
    
    if (!match) break;
  }
}
console.log("Finished");
