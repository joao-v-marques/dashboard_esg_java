package com.joao_v_marques.dashboard_esg.suppliers.supply_category;

import org.springframework.data.jpa.repository.JpaRepository;

public interface SupplyCategoryRepository extends JpaRepository<SupplyCategory, Integer> {

    boolean existsByNameIgnoreCase(String name);

    // Usado no PUT, para validar duplicidade ignorando a própria categoria editada
    boolean existsByNameIgnoreCaseAndIdNot(String name, Integer id);
}
