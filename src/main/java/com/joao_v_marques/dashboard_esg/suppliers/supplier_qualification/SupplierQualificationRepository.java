package com.joao_v_marques.dashboard_esg.suppliers.supplier_qualification;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SupplierQualificationRepository extends JpaRepository<SupplierQualification, Integer> {

    // Carrega as associações LAZY no mesmo SELECT (via JOIN), evitando o N+1 no toResponse.
    // Ordena pela data de lançamento, com o ID como desempate para manter a ordem estável
    @EntityGraph(attributePaths = {"supplier", "result", "qualifiedBy", "sector", "updatedBy"})
    List<SupplierQualification> findAllByOrderByCreatedAtAscIdAsc();
}
