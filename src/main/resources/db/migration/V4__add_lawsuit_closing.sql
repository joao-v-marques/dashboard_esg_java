-- ENCERRAMENTO DE PROCESSOS JURÍDICOS
-- is_active = false indica processo encerrado; closed_at/closed_by registram quando e por quem.
-- Ao reabrir, as duas colunas voltam a NULL.
ALTER TABLE lawsuits
    ADD COLUMN closed_at TIMESTAMPTZ,
    ADD COLUMN closed_by INT,                -- FK users
    ADD CONSTRAINT fk_lawsuit_closed_by FOREIGN KEY (closed_by) REFERENCES users(id);
