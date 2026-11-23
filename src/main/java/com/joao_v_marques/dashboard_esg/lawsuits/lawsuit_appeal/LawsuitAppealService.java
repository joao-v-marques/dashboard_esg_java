package com.joao_v_marques.dashboard_esg.lawsuits.lawsuit_appeal;

import com.joao_v_marques.dashboard_esg.lawsuits.lawsuit.LawsuitRepository;
import com.joao_v_marques.dashboard_esg.lawsuits.lawsuit_appeal.dto.LawsuitAppealResponse;
import com.joao_v_marques.dashboard_esg.shared.exceptions.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class LawsuitAppealService {

    private final LawsuitAppealRepository lawsuitAppealRepository;
    private final LawsuitRepository lawsuitRepository;

    public LawsuitAppealService(LawsuitAppealRepository lawsuitAppealRepository, LawsuitRepository lawsuitRepository) {
        this.lawsuitAppealRepository = lawsuitAppealRepository;
        this.lawsuitRepository = lawsuitRepository;
    }

    // GET de todos os recursos cadastrados, agrupados por processo e ordenados pela sequência
    @Transactional(readOnly = true)
    public List<LawsuitAppealResponse> findAll() {
        return lawsuitAppealRepository.findAllByOrderByLawsuitIdAscAppealSequenceAsc()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    // GET dos recursos de um processo específico
    @Transactional(readOnly = true)
    public List<LawsuitAppealResponse> findAllByLawsuit(Integer lawsuitId) {
        // Confirmar se o processo realmente existe, para não confundir "sem recursos" com "processo inexistente"
        if (!lawsuitRepository.existsById(lawsuitId)) {
            throw new ResourceNotFoundException("Não foi encontrado nenhum processo com o ID informado.");
        }

        return lawsuitAppealRepository.findByLawsuitIdOrderByAppealSequenceAsc(lawsuitId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    private LawsuitAppealResponse toResponse(LawsuitAppeal appeal) {
        return new LawsuitAppealResponse(
                appeal.getId(),
                appeal.getLawsuit().getId(),
                appeal.getLawsuit().getCaseNumber(),
                appeal.getAppealDate(),
                appeal.getAppealNumber(),
                appeal.getAppellant(),
                appeal.getAppellee(),
                appeal.getClaimValue(),
                appeal.getJudgingBody().getId(),
                appeal.getJudgingBody().getName(),
                appeal.getStatus().getId(),
                appeal.getStatus().getName(),
                appeal.getLossProbability().getId(),
                appeal.getLossProbability().getName(),
                appeal.getAppealSequence(),
                appeal.getInsertedBy().getId(),
                appeal.getInsertedBy().getName(),
                appeal.getCreatedAt(),
                appeal.getUpdatedAt(),
                appeal.getUpdatedBy() != null ? appeal.getUpdatedBy().getId() : null,
                appeal.getUpdatedBy() != null ? appeal.getUpdatedBy().getName() : null,
                appeal.isActive()
        );
    }
}
