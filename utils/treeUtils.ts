
import { v4 as uuidv4 } from 'uuid';
import { StructureLevel, StructureNode, StructureConfig, NovelState } from '../types';

// --- Node Creation Helper ---
export const createNode = (title: string, level: StructureLevel, summary: string = ''): StructureNode => ({
    id: uuidv4(),
    title,
    summary,
    level,
    children: [],
    isExpanded: true,
    isDeleted: false,
    lastModified: Date.now()
});

// --- Tree Generation Logic ---
export const generateStructureSkeleton = (
    config: StructureConfig, 
    novelTitle: string, 
    novelOutline: string
): StructureNode => {
    const root: StructureNode = {
        id: 'root',
        title: novelTitle || '我的小说',
        summary: novelOutline || '全书大纲...',
        level: StructureLevel.ROOT,
        isExpanded: true,
        children: []
    };

    let globalChapterIndex = 0;

    for (let v = 1; v <= config.volumes; v++) {
        const volNode = createNode(`第${v}册`, StructureLevel.VOLUME);
        for (let p = 1; p <= config.partsPerVolume; p++) {
            const partNode = createNode(`第${p}卷`, StructureLevel.PART);
            for (let s = 1; s <= config.stagesPerPart; s++) {
                const stageNode = createNode(`第${s}阶段`, StructureLevel.STAGE);
                for (let c = 1; c <= config.chaptersPerStage; c++) {
                    globalChapterIndex++;
                    const chapNode = createNode(`第${globalChapterIndex}章`, StructureLevel.CHAPTER);
                    
                    const plotNames = ['解钩情节', ...Array(Math.max(0, config.plotsPerChapter - 2)).fill('主要情节'), '钩子情节'];
                    chapNode.children = plotNames.map((name, idx) => {
                        let finalTitle = name;
                        if (name === '主要情节') finalTitle = `${name} ${idx}`;
                        return createNode(finalTitle, StructureLevel.PLOT);
                    });
                    stageNode.children.push(chapNode);
                }
                partNode.children.push(stageNode);
            }
            volNode.children.push(partNode);
        }
        root.children.push(volNode);
    }

    return root;
};

// --- Tree Traversal & Search ---

export const findNodeById = (root: StructureNode, id: string): StructureNode | null => {
    if (root.id === id) return root;
    if (root.children) {
        for (const child of root.children) {
            const found = findNodeById(child, id);
            if (found) return found;
        }
    }
    return null;
};

export const findPath = (targetId: string, current: StructureNode, path: StructureNode[] = []): StructureNode[] | null => {
    if (current.id === targetId) return [...path, current];
    if (current.children) {
        for (const child of current.children) {
            const result = findPath(targetId, child, [...path, current]);
            if (result) return result;
        }
    }
    return null;
};

export const findDeepestFirstNode = (node: StructureNode): StructureNode => {
    if (!node.children || node.children.length === 0) return node;
    const firstActiveChild = node.children.find(c => !c.isDeleted) || node.children[0];
    if (!firstActiveChild) return node;
    return findDeepestFirstNode(firstActiveChild);
};

export const findSmartDefaultNode = (root: StructureNode): StructureNode => {
    let allChapters: StructureNode[] = [];
    
    // Flatten tree to find all active chapters
    const traverse = (node: StructureNode) => {
        if (node.isDeleted) return;
        if (node.level === StructureLevel.CHAPTER) {
            allChapters.push(node);
        }
        if (node.children) {
            node.children.forEach(traverse);
        }
    }
    traverse(root);

    if (allChapters.length === 0) return root;

    // Check for content
    const chaptersWithContent = allChapters.filter(c => c.content && c.content.trim().length > 0);

    if (chaptersWithContent.length > 0) {
        // Sort: Latest modified first
        chaptersWithContent.sort((a, b) => {
            const timeA = a.lastModified || 0;
            const timeB = b.lastModified || 0;
            return timeB - timeA;
        });
        
        return chaptersWithContent[0];
    } else {
        return allChapters[0];
    }
};

// --- Tree Manipulation (Immutable-ish) ---

export const renumberTree = (root: StructureNode): StructureNode => {
    const counters = { chapter: 0 };
    const traverse = (node: StructureNode) => {
        if (!node.children || node.children.length === 0) return;
        let vol = 0, part = 0, stage = 0, plotMain = 0;
        node.children.forEach(child => {
            if (child.isDeleted) return; 
            if (child.level === StructureLevel.VOLUME) { vol++; child.title = `第${vol}册`; }
            else if (child.level === StructureLevel.PART) { part++; child.title = `第${part}卷`; }
            else if (child.level === StructureLevel.STAGE) { stage++; child.title = `第${stage}阶段`; }
            else if (child.level === StructureLevel.CHAPTER) { counters.chapter++; child.title = `第${counters.chapter}章`; }
            else if (child.level === StructureLevel.PLOT && child.title.startsWith('主要情节')) { plotMain++; child.title = `主要情节 ${plotMain}`; }
            traverse(child);
        });
    };
    const rootClone = JSON.parse(JSON.stringify(root)); 
    traverse(rootClone);
    return rootClone;
};

export const updateNodeRecursive = (node: StructureNode, targetId: string, updates: Partial<StructureNode>): StructureNode => {
    if (node.id === targetId) return { ...node, ...updates };
    if (node.children) {
        return { ...node, children: node.children.map(child => updateNodeRecursive(child, targetId, updates)) };
    }
    return node;
};

export const addNodeRecursive = (node: StructureNode, parentId: string, newNode: StructureNode): StructureNode => {
    if (node.id === parentId) {
        return { ...node, children: [...(node.children || []), newNode] };
    }
    if (node.children) {
        return { ...node, children: node.children.map(child => addNodeRecursive(child, parentId, newNode)) };
    }
    return node;
};

const markSubtreeDeleted = (node: StructureNode): StructureNode => ({
    ...node,
    isDeleted: true,
    children: node.children?.map(markSubtreeDeleted) || []
});

export const softDeleteNodeRecursive = (node: StructureNode, targetId: string): StructureNode => {
    if (node.id === targetId) return markSubtreeDeleted(node);
    if (node.children) {
        return { ...node, children: node.children.map(child => softDeleteNodeRecursive(child, targetId)) };
    }
    return node;
};

const markSubtreeRestored = (node: StructureNode): StructureNode => ({
    ...node,
    isDeleted: false,
    children: node.children?.map(markSubtreeRestored) || []
});

export const restoreNodeRecursive = (node: StructureNode, targetId: string): StructureNode => {
    if (node.id === targetId) return markSubtreeRestored(node);
    if (node.children) {
        return { ...node, children: node.children.map(child => restoreNodeRecursive(child, targetId)) };
    }
    return node;
};

/**
 * Updates summaries for children of a specific node (parentId).
 * If parentId is root.id, it updates root's children (Volumes).
 * Accepts strings or objects {title, summary} for input data.
 */
export const batchUpdateChildrenSummaries = (root: StructureNode, parentId: string, data: (string | { title?: string, summary: string })[]): StructureNode => {
    const update = (node: StructureNode): StructureNode => {
        if (node.id === parentId) {
            const newChildren = [...(node.children || [])];
            const activeChildren = newChildren.filter(c => !c.isDeleted);
            
            activeChildren.forEach((child, idx) => {
                const item = data[idx];
                if (item) {
                    const originalIndex = newChildren.findIndex(c => c.id === child.id);
                    if (originalIndex !== -1) {
                        const newProps: Partial<StructureNode> = { lastModified: Date.now() };
                        
                        if (typeof item === 'string') {
                            newProps.summary = item;
                        } else {
                            if (item.summary) newProps.summary = item.summary;
                            if (item.title) newProps.title = item.title;
                        }

                        newChildren[originalIndex] = {
                            ...newChildren[originalIndex],
                            ...newProps
                        };
                    }
                }
            });
            return { ...node, children: newChildren };
        }
        
        if (node.children) {
            return { ...node, children: node.children.map(c => update(c)) };
        }
        return node;
    };

    return update(root);
};

export const batchUpdateVolumeSummaries = batchUpdateChildrenSummaries;

// --- Variable Generation Utilities ---

export interface VariableCategory {
    name: string;
    items: { label: string; key: string }[];
}

/**
 * Generates a flat map of all available variables from the novel state.
 * Keys are formatted for prompt insertion (e.g. V1_Summary).
 */
export const generateGlobalVariables = (novel: NovelState): Record<string, string> => {
    const vars: Record<string, string> = {};

    // 1. Soul Settings
    if (novel.title) vars['Soul_Title'] = novel.title;
    if (novel.type) vars['Soul_Type'] = novel.type;
    if (novel.idea) vars['Soul_Idea'] = novel.idea;
    if (novel.outline) vars['Soul_Outline'] = novel.outline;
    if (novel.introduction) vars['Soul_Intro'] = novel.introduction;
    if (novel.coverPrompt) vars['Soul_Cover'] = novel.coverPrompt;

    // 2. Structure Config
    if (novel.structureConfig) {
        vars['Config_Volumes'] = novel.structureConfig.volumes.toString();
        vars['Config_PartsPerVol'] = novel.structureConfig.partsPerVolume.toString();
        vars['Config_StagesPerPart'] = novel.structureConfig.stagesPerPart.toString();
        vars['Config_ChaptersPerStage'] = novel.structureConfig.chaptersPerStage.toString();
        vars['Config_PlotsPerChapter'] = novel.structureConfig.plotsPerChapter.toString();
    }

    // 3. Structure Nodes (Traverse)
    // Naming convention:
    // Volume: V{i}_Summary, V{i}_Title
    // Part: V{i}_P{j}_Summary
    // Stage: V{i}_P{j}_S{k}_Summary
    // Chapter: V{i}_P{j}_S{k}_C{l}_Summary (This is long, but precise)
    // We can also add global indexes like Chapter_10_Summary if needed, but hierarchy is safer for batch logic.

    if (novel.rootNode.children && novel.rootNode.children.length > 0) {
        let v = 0;
        novel.rootNode.children.forEach(vol => {
            if (vol.isDeleted) return;
            v++;
            const vKey = `V${v}`;
            vars[`${vKey}_Title`] = vol.title;
            vars[`${vKey}_Summary`] = vol.summary || '';

            if (vol.children) {
                let p = 0;
                vol.children.forEach(part => {
                    if (part.isDeleted) return;
                    p++;
                    const pKey = `${vKey}_P${p}`;
                    vars[`${pKey}_Title`] = part.title;
                    vars[`${pKey}_Summary`] = part.summary || '';

                    if (part.children) {
                        let s = 0;
                        part.children.forEach(stage => {
                            if (stage.isDeleted) return;
                            s++;
                            const sKey = `${pKey}_S${s}`;
                            vars[`${sKey}_Title`] = stage.title;
                            vars[`${sKey}_Summary`] = stage.summary || '';

                            if (stage.children) {
                                let c = 0;
                                stage.children.forEach(chap => {
                                    if (chap.isDeleted) return;
                                    c++;
                                    const cKey = `${sKey}_C${c}`;
                                    vars[`${cKey}_Title`] = chap.title;
                                    vars[`${cKey}_Summary`] = chap.summary || '';
                                    vars[`${cKey}_Content`] = chap.content || '';
                                });
                            }
                        });
                    }
                });
            }
        });
    }

    return vars;
};

/**
 * Generates categorized variable options for the dropdown UI.
 */
export const getNovelVariableCategories = (novel: NovelState): VariableCategory[] => {
    const categories: VariableCategory[] = [];

    // 1. Soul Settings
    categories.push({
        name: '小说灵魂设定',
        items: [
            { label: '书名 (Title)', key: 'Soul_Title' },
            { label: '类型 (Type)', key: 'Soul_Type' },
            { label: '核心脑洞 (Idea)', key: 'Soul_Idea' },
            { label: '故事大纲 (Outline)', key: 'Soul_Outline' },
            { label: '简介 (Intro)', key: 'Soul_Intro' },
            { label: '封面提示词 (Cover)', key: 'Soul_Cover' }
        ]
    });

    // 2. Structure Config
    categories.push({
        name: '小说结构参数',
        items: [
            { label: '总册数', key: 'Config_Volumes' },
            { label: '每册卷数', key: 'Config_PartsPerVol' },
            { label: '每卷阶段数', key: 'Config_StagesPerPart' },
            { label: '每阶章节数', key: 'Config_ChaptersPerStage' },
            { label: '每章情节数', key: 'Config_PlotsPerChapter' }
        ]
    });

    // 3. Structure Generated?
    const hasStructure = novel.rootNode.children && novel.rootNode.children.length > 0;
    
    if (hasStructure) {
        // Volumes
        const volItems: { label: string; key: string }[] = [];
        let v = 0;
        
        // Parts / Stages / Chapters buckets
        const partItems: { label: string; key: string }[] = [];
        const stageItems: { label: string; key: string }[] = [];
        const chapItems: { label: string; key: string }[] = [];

        novel.rootNode.children.forEach(vol => {
            if (vol.isDeleted) return;
            v++;
            volItems.push({ label: `${vol.title} 大纲`, key: `V${v}_Summary` });
            
            if (vol.children) {
                let p = 0;
                vol.children.forEach(part => {
                    if (part.isDeleted) return;
                    p++;
                    // Add Part
                    partItems.push({
                        label: `${vol.title}/${part.title}`,
                        key: `V${v}_P${p}_Summary`
                    });
                    
                    if (part.children) {
                        let s = 0;
                        part.children.forEach(stage => {
                            if (stage.isDeleted) return;
                            s++;
                            // Add Stage
                            stageItems.push({ 
                                label: `${vol.title}/${part.title}/${stage.title}`, 
                                key: `V${v}_P${p}_S${s}_Summary` 
                            });

                            if (stage.children) {
                                let c = 0;
                                stage.children.forEach(chap => {
                                    if (chap.isDeleted) return;
                                    c++;
                                    // Add Chapter
                                    chapItems.push({
                                        label: `${vol.title.replace('第','').replace('册','')}-${stage.title.replace('第','').replace('阶段','')}-${chap.title}`,
                                        key: `V${v}_P${p}_S${s}_C${c}_Summary`
                                    });
                                });
                            }
                        });
                    }
                });
            }
        });

        categories.push({
            name: '小说册大纲',
            items: volItems
        });
        
        categories.push({
            name: '小说卷大纲',
            items: partItems
        });

        categories.push({
            name: '可选变量阶段',
            items: stageItems
        });

        categories.push({
            name: '可选阶段章节',
            items: chapItems
        });

    } else {
        // Empty Placeholders to show categories exist but are empty
        categories.push({ name: '小说册大纲 (未生成)', items: [] });
        categories.push({ name: '小说卷大纲 (未生成)', items: [] });
        categories.push({ name: '可选变量阶段 (未生成)', items: [] });
        categories.push({ name: '可选阶段章节 (未生成)', items: [] });
    }

    return categories;
};
