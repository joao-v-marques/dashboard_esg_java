package com.joao_v_marques.dashboard_esg.lawsuits.lawsuit_appeal;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface LawsuitAppealRepository extends JpaRepository<LawsuitAppeal, Integer> {

    // Carrega as associações LAZY no mesmo SELECT (via JOIN), evitando o N+1 no toResponse.
    // Ordena por processo e, dentro dele, pela sequência do recurso
    @EntityGraph(attributePaths = {"lawsuit", "judgingBody", "status", "lossProbability", "insertedBy", "updatedBy"})
    List<LawsuitAppeal> findAllByOrderByLawsuitIdAscAppealSequenceAsc();

    // Recursos de um processo específico, na ordem da sequência
    @EntityGraph(attributePaths = {"lawsuit", "judgingBody", "status", "lossProbability", "insertedBy", "updatedBy"})
    List<LawsuitAppeal> findByLawsuitIdOrderByAppealSequenceAsc(Integer lawsuitId);

    // Maior sequência já usada no processo (0 se ainda não houver recurso), usada no POST para gerar a próxima.
    // Considera também recursos inativos, já que a constraint UNIQUE (lawsuit_id, appeal_sequence) vale para todos
    @Query("SELECT COALESCE(MAX(a.appealSequence), 0) FROM LawsuitAppeal a WHERE a.lawsuit.id = :lawsuitId")
    Integer findMaxAppealSequenceByLawsuitId(@Param("lawsuitId") Integer lawsuitId);
}
