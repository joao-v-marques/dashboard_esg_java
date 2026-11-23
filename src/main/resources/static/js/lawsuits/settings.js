/* ==========================================================================
   settings.js — Processos Jurídicos › Configurações (EMPLOYEE_LEGAL e acima,
   o que inclui administradores pela hierarquia de roles).

   CRUD dos cadastros-chave de um processo: objetos, trâmites, status, chances
   de perda e órgãos julgadores, no mesmo controlador da tela de Configurações
   da Administração (js/settings/settings-page.js). Processos e recursos são
   carregados à parte só para mostrar onde cada cadastro está em uso.
   ========================================================================== */

import { initSettingsPage } from '../settings/settings-page.js';
import { simpleNameSection } from '../settings/sections.js';
import { intFormat } from '../format.js';

const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);

// Mensagens da seção com a concordância do cadastro ("Objeto cadastrado", "Chance de perda cadastrada")
function messages(singular, feminine) {
    const o = feminine ? 'a' : 'o';
    const none = feminine ? 'Nenhuma' : 'Nenhum';
    return {
        created: `${capitalize(singular)} cadastrad${o} com sucesso.`,
        updated: `${capitalize(singular)} atualizad${o} com sucesso.`,
        deactivated: `${capitalize(singular)} desativad${o}.`,
        reactivated: `${capitalize(singular)} reativad${o}.`,
        empty: `${none} ${singular} cadastrad${o}`,
        emptyInactive: `${none} ${singular} inativ${o}`,
        emptyActive: `${none} ${singular} ativ${o}`,
    };
}

/* Uso nos processos e recursos --------------------------------------------- */

// Quantos processos e recursos ativos usam o cadastro (null enquanto os dados de apoio não chegam)
function usageOf(row, ctx, { lawsuitKey, appealKey }) {
    const { lawsuits, appeals } = ctx.extras;
    const count = (rows, key) => (key && rows ? rows.filter((item) => item.isActive !== false && item[key] === row.id).length : 0);
    if ((lawsuitKey && !lawsuits) || (appealKey && !appeals)) return null;
    return { lawsuits: count(lawsuits, lawsuitKey), appeals: count(appeals, appealKey) };
}

const plural = (n, one, many) => `${intFormat.format(n)} ${n === 1 ? one : many}`;

function usageText(usage) {
    const parts = [];
    if (usage.lawsuits) parts.push(plural(usage.lawsuits, 'processo', 'processos'));
    if (usage.appeals) parts.push(plural(usage.appeals, 'recurso', 'recursos'));
    return parts.join(' e ');
}

function usageColumn(keys) {
    return (ctx) => [{
        label: 'Em uso',
        className: 'col-nowrap',
        render: (row) => {
            const usage = usageOf(row, ctx, keys);
            const cell = document.createElement('span');
            if (!usage) {
                cell.className = 'usage usage--idle';
                cell.textContent = '–';
                return cell;
            }
            const text = usageText(usage);
            cell.className = text ? 'usage' : 'usage usage--none';
            cell.textContent = text || 'Sem uso';
            return cell;
        },
    }];
}

// Texto da confirmação de desativar: o que muda para os processos que já usam o cadastro
function deactivateEffect(keys, { pronoun, newUse }) {
    const object = pronoun === 'ela' ? 'a' : 'o';
    return (row, ctx) => {
        const usage = usageOf(row, ctx, keys);
        const text = usage && usageText(usage);
        const keep = text ? ` Continua valendo para quem já ${object} usa: ${text}.` : '';
        return `${capitalize(pronoun)} deixa de aparecer como opção ${newUse}.${keep} Você pode reativar quando quiser.`;
    };
}

/* Seções ------------------------------------------------------------------- */

function legalSection({ keys, feminine = false, newUse, ...config }) {
    const pronoun = feminine ? 'ela' : 'ele';
    return simpleNameSection({
        nameMaxLength: 255,
        modalSize: 'md',
        extraColumns: usageColumn(keys),
        deactivateEffect: deactivateEffect(keys, { pronoun, newUse }),
        reactivateEffect: `${capitalize(pronoun)} volta a aparecer como opção ${newUse}.`,
        messages: messages(config.singular, feminine),
        ...config,
    });
}

const SECTIONS = [
    legalSection({
        id: 'objetos',
        title: 'Objetos',
        navDescription: 'Do que trata a ação',
        description: 'O objeto resume o pedido da ação, como cobertura, reembolso ou dano moral.',
        icon: 'list',
        endpoint: 'api/subject-matters',
        singular: 'objeto',
        plural: 'objetos',
        newLabel: 'Novo objeto',
        nameLabel: 'Objeto',
        namePlaceholder: 'Ex.: Cobertura (Home Care)',
        nameMultiline: true,
        searchPlaceholder: 'Buscar objeto',
        keys: { lawsuitKey: 'subjectMatterId' },
        newUse: 'no registro e na edição de processos',
    }),
    legalSection({
        id: 'tramites',
        title: 'Trâmites',
        navDescription: 'Vara ou juízo do processo',
        description: 'O trâmite indica onde o processo corre na primeira instância, como a vara e a comarca.',
        icon: 'branch',
        endpoint: 'api/proceeding-stages',
        singular: 'trâmite',
        plural: 'trâmites',
        newLabel: 'Novo trâmite',
        nameLabel: 'Trâmite',
        namePlaceholder: 'Ex.: 1ª Vara Cível da Comarca de São Sebastião do Paraíso',
        nameMultiline: true,
        searchPlaceholder: 'Buscar trâmite',
        keys: { lawsuitKey: 'proceedingStageId' },
        newUse: 'no registro e na edição de processos',
    }),
    legalSection({
        id: 'status',
        title: 'Status',
        navDescription: 'Andamento de processos e recursos',
        description: 'O status descreve o andamento atual e vale tanto para processos quanto para recursos.',
        icon: 'clock',
        endpoint: 'api/lawsuit-status',
        singular: 'status',
        plural: 'status',
        newLabel: 'Novo status',
        nameLabel: 'Status',
        namePlaceholder: 'Ex.: Aguarda perícia.',
        nameMultiline: true,
        // Status costumam ser frases com ponto final ("Aguarda perícia."): sem ele nas confirmações e títulos
        displayName: (row) => String(row.name).replace(/\.\s*$/, ''),
        searchPlaceholder: 'Buscar status',
        keys: { lawsuitKey: 'statusId', appealKey: 'statusId' },
        newUse: 'para novos processos e recursos',
    }),
    legalSection({
        id: 'chances-de-perda',
        title: 'Chances de perda',
        navDescription: 'Risco de perder a ação',
        description: 'A chance de perda classifica o risco de cada processo e recurso, como remota ou provável.',
        icon: 'trendUp',
        endpoint: 'api/loss-probabilities',
        singular: 'chance de perda',
        plural: 'chances de perda',
        feminine: true,
        newLabel: 'Nova chance de perda',
        nameLabel: 'Chance de perda',
        namePlaceholder: 'Ex.: Possível',
        searchPlaceholder: 'Buscar chance de perda',
        modalSize: 'sm',
        keys: { lawsuitKey: 'lossProbabilityId', appealKey: 'lossProbabilityId' },
        newUse: 'para novos processos e recursos',
    }),
    legalSection({
        id: 'orgaos-julgadores',
        title: 'Órgãos julgadores',
        navDescription: 'Câmaras e tribunais dos recursos',
        description: 'O órgão julgador é a câmara ou o tribunal que analisa cada recurso.',
        icon: 'gavel',
        endpoint: 'api/judging-bodies',
        singular: 'órgão julgador',
        plural: 'órgãos julgadores',
        newLabel: 'Novo órgão julgador',
        nameLabel: 'Órgão julgador',
        namePlaceholder: 'Ex.: 5ª Câmara Cível - TJMG',
        searchPlaceholder: 'Buscar órgão julgador',
        keys: { appealKey: 'judgingBodyId' },
        newUse: 'no registro de recursos',
    }),
];

initSettingsPage(SECTIONS, {
    pageTitle: 'Configurações de Processos Jurídicos',
    extras: { lawsuits: 'api/lawsuits', appeals: 'api/lawsuit-appeals' },
});
