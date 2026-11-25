-- Migration para adicionar tabelas para a lógica de fornecedores
CREATE TABLE supply_categories (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    name VARCHAR(255) NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- Tabela de bancos, identificados pelo código COMPE
CREATE TABLE banks (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    code CHAR(3) NOT NULL UNIQUE, -- Código COMPE
    name VARCHAR(150) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- Inserção inicial dos principais bancos
INSERT INTO banks (code, name)
VALUES
    ('001', 'Banco do Brasil'),
    ('004', 'Banco do Nordeste'),
    ('021', 'Banestes'),
    ('033', 'Santander'),
    ('037', 'Banpará'),
    ('041', 'Banrisul'),
    ('070', 'BRB - Banco de Brasília'),
    ('077', 'Banco Inter'),
    ('085', 'Cooperativa Central Ailos'),
    ('104', 'Caixa Econômica Federal'),
    ('136', 'Unicred'),
    ('208', 'BTG Pactual'),
    ('212', 'Banco Original'),
    ('237', 'Bradesco'),
    ('260', 'Nu Pagamentos (Nubank)'),
    ('290', 'PagSeguro'),
    ('323', 'Mercado Pago'),
    ('336', 'C6 Bank'),
    ('341', 'Itaú Unibanco'),
    ('380', 'PicPay'),
    ('422', 'Banco Safra'),
    ('655', 'Banco Votorantim (BV)'),
    ('748', 'Sicredi'),
    ('756', 'Sicoob');

-- Tabela de resultados da qualificação, a princípio é apenas Aprovado, Aprovado com restrição e Reprovado
CREATE TABLE qualification_results (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    name VARCHAR(100) NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO qualification_results (name)
VALUES
    ('Aprovado'),
    ('Aprovado com restrição'),
    ('Reprovado');

-- Tabela de fornecedores (somente pessoa jurídica, identificada pelo CNPJ)
CREATE TABLE suppliers (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    -- Identificação
    cnpj VARCHAR(14) NOT NULL UNIQUE, -- CNPJ alfanumérico, sem máscara e em maiúsculas
    corporate_name VARCHAR(255) NOT NULL,
    trade_name VARCHAR(255),
    state_registration VARCHAR(20) NOT NULL, -- Inscrição estadual, pode ser ISENTO
    supply_category_id INT NOT NULL, -- FK tabela supply_categories
    product_description TEXT,

    -- Endereço
    zip_code CHAR(8),
    street VARCHAR(255),
    number VARCHAR(255),
    complement VARCHAR(100),
    neighborhood VARCHAR(100),
    city VARCHAR(100),
    state CHAR(2),

    -- Contato
    phone VARCHAR(11) NOT NULL, -- Somente dígitos, com DDD
    contact_name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL,
    website VARCHAR(255),

    -- Dados bancários
    bank_id INT NOT NULL, -- FK tabela banks
    agency VARCHAR(10) NOT NULL, -- Agência com dígito
    account VARCHAR(20) NOT NULL, -- Conta com dígito

    inserted_by INT NOT NULL, -- FK users
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    updated_by INT, -- FK users
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    -- FOREIGN KEYS
    CONSTRAINT fk_supplier_category FOREIGN KEY (supply_category_id) REFERENCES supply_categories(id),
    CONSTRAINT fk_supplier_bank FOREIGN KEY (bank_id) REFERENCES banks(id),
    CONSTRAINT fk_supplier_inserted_by FOREIGN KEY (inserted_by) REFERENCES users(id),
    CONSTRAINT fk_supplier_updated_by FOREIGN KEY (updated_by) REFERENCES users(id)
);

CREATE INDEX idx_suppliers_category ON suppliers(supply_category_id);
CREATE INDEX idx_suppliers_bank ON suppliers(bank_id);

-- Tabela de fichas de qualificação do fornecedor (histórico: a vigente é a de qualification_date mais recente)
CREATE TABLE supplier_qualifications (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    supplier_id INT NOT NULL, -- FK tabela suppliers

    -- Preenchido pelo fornecedor
    filled_by_name VARCHAR(150) NOT NULL, -- Nome completo do responsável pelas informações
    filled_by_position VARCHAR(100) NOT NULL, -- Cargo
    filled_at DATE NOT NULL, -- Data do preenchimento

    -- Qualificação
    result_id INT NOT NULL, -- FK tabela qualification_results
    result_notes TEXT, -- Obrigatório quando o resultado for Aprovado com restrição ou Reprovado (validado na aplicação)
    qualified_by INT NOT NULL, -- FK users: usuário logado que lançou a ficha
    sector_id INT NOT NULL, -- FK sectors: setor do usuário no momento do lançamento
    qualification_date DATE NOT NULL,

    -- Diretoria
    board_approval_notes TEXT, -- Observações da aprovação da diretoria (opcional)

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    updated_by INT, -- FK users

    -- FOREIGN KEYS
    CONSTRAINT fk_qualification_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    CONSTRAINT fk_qualification_result FOREIGN KEY (result_id) REFERENCES qualification_results(id),
    CONSTRAINT fk_qualification_qualified_by FOREIGN KEY (qualified_by) REFERENCES users(id),
    CONSTRAINT fk_qualification_sector FOREIGN KEY (sector_id) REFERENCES sectors(id),
    CONSTRAINT fk_qualification_updated_by FOREIGN KEY (updated_by) REFERENCES users(id)
);

-- Índice composto também atende a busca da ficha vigente (mais recente) de cada fornecedor
CREATE INDEX idx_qualifications_supplier_date ON supplier_qualifications(supplier_id, qualification_date DESC);
CREATE INDEX idx_qualifications_result ON supplier_qualifications(result_id);

-- Tabela de documentos analisados na ficha de qualificação
CREATE TABLE qualification_documents (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    qualification_id INT NOT NULL, -- FK tabela supplier_qualifications

    -- Documento
    name VARCHAR(255) NOT NULL, -- Nome do documento inserido
    description VARCHAR(255) NOT NULL, -- Texto livre (autocomplete com as descrições já usadas)
    document_path VARCHAR(255) NOT NULL UNIQUE, -- Caminho do documento na VM

    -- Validade
    has_expiry BOOLEAN NOT NULL, -- Checkbox "Possui validade?"
    expiry_date DATE, -- Obrigatório quando has_expiry = true

    -- Renovação: o documento novo aponta para o que ele substitui, e o antigo fica com is_current = false
    replaces_document_id INT, -- FK tabela qualification_documents
    is_current BOOLEAN NOT NULL DEFAULT TRUE,

    is_conformity BOOLEAN NOT NULL, -- boolean que verifica "Está conforme?"
    notes TEXT, -- Obrigatório quando is_conformity = false (validado na aplicação)

    inserted_by INT NOT NULL, -- FK users
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    updated_by INT, -- FK users

    -- FOREIGN KEYS
    CONSTRAINT fk_document_qualification FOREIGN KEY (qualification_id) REFERENCES supplier_qualifications(id),
    CONSTRAINT fk_document_replaces FOREIGN KEY (replaces_document_id) REFERENCES qualification_documents(id),
    CONSTRAINT fk_document_inserted_by FOREIGN KEY (inserted_by) REFERENCES users(id),
    CONSTRAINT fk_document_updated_by FOREIGN KEY (updated_by) REFERENCES users(id),

    -- Constraints de CHECK
    CONSTRAINT ck_document_expiry CHECK (has_expiry = (expiry_date IS NOT NULL)), -- com validade exige data; sem validade não guarda data
    CONSTRAINT ck_document_not_self_replace CHECK (replaces_document_id IS NULL OR replaces_document_id <> id),
    CONSTRAINT uq_document_replaces UNIQUE (replaces_document_id) -- cada documento é renovado uma única vez; renovações sucessivas formam uma corrente
);

CREATE INDEX idx_documents_qualification ON qualification_documents(qualification_id);
CREATE INDEX idx_documents_current_expiry ON qualification_documents(expiry_date) WHERE is_current AND has_expiry;
