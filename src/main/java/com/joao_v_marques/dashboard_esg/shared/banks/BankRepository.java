package com.joao_v_marques.dashboard_esg.shared.banks;

import org.springframework.data.jpa.repository.JpaRepository;

public interface BankRepository extends JpaRepository<Bank, Integer> {

    boolean existsByCode(String code);

    // Usado no PUT, para validar duplicidade ignorando o próprio banco editado
    boolean existsByCodeAndIdNot(String code, Integer id);
}
