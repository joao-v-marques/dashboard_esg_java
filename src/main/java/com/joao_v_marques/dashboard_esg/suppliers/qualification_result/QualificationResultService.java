package com.joao_v_marques.dashboard_esg.suppliers.qualification_result;

import com.joao_v_marques.dashboard_esg.shared.exceptions.ConflictException;
import com.joao_v_marques.dashboard_esg.shared.exceptions.ResourceNotFoundException;
import com.joao_v_marques.dashboard_esg.suppliers.qualification_result.dto.QualificationResultRequest;
import com.joao_v_marques.dashboard_esg.suppliers.qualification_result.dto.QualificationResultResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class QualificationResultService {

    private final QualificationResultRepository qualificationResultRepository;

    public QualificationResultService(QualificationResultRepository qualificationResultRepository) {
        this.qualificationResultRepository = qualificationResultRepository;
    }

    // GET de todos os resultados de qualificação cadastrados
    @Transactional(readOnly = true)
    public List<QualificationResultResponse> findAll() {
        return qualificationResultRepository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public QualificationResultResponse create(QualificationResultRequest request) {
        String name = request.name().trim();

        if (qualificationResultRepository.existsByNameIgnoreCase(name)) {
            throw new ConflictException("O resultado de qualificação que está tentando cadastrar já existe");
        }

        // Montar entidade com base na dto
        QualificationResult qualificationResult = new QualificationResult();
        qualificationResult.setName(name);

        QualificationResult saved = qualificationResultRepository.save(qualificationResult);

        return toResponse(saved);
    }

    @Transactional
    public QualificationResultResponse update(Integer qualificationResultId, QualificationResultRequest request) {
        String name = request.name().trim();

        // Valida se o resultado editado realmente existe
        QualificationResult qualificationResult = qualificationResultRepository.findById(qualificationResultId)
                .orElseThrow(() -> new ResourceNotFoundException("Não foi encontrado nenhum resultado de qualificação com o ID fornecido."));

        // Validações que a DTO não cobre
        if (!qualificationResult.isActive()) {
            throw new IllegalArgumentException("Não é possível editar um resultado de qualificação inativo.");
        }

        if (qualificationResultRepository.existsByNameIgnoreCaseAndIdNot(name, qualificationResultId)) {
            throw new ConflictException("Já existe outro resultado de qualificação cadastrado com este nome");
        }

        // Atualizar a entidade já existente
        qualificationResult.setName(name);

        return toResponse(qualificationResult);
    }

    @Transactional
    public QualificationResultResponse deactivate(Integer qualificationResultId) {
        // Valida se o resultado desativado realmente existe
        QualificationResult qualificationResult = qualificationResultRepository.findById(qualificationResultId)
                .orElseThrow(() -> new ResourceNotFoundException("Não foi encontrado nenhum resultado de qualificação com o ID fornecido."));

        if (!qualificationResult.isActive()) {
            throw new IllegalArgumentException("Este resultado de qualificação já está inativo.");
        }

        qualificationResult.setActive(false);

        return toResponse(qualificationResult);
    }

    @Transactional
    public QualificationResultResponse reactivate(Integer qualificationResultId) {
        // Valida se o resultado reativado realmente existe
        QualificationResult qualificationResult = qualificationResultRepository.findById(qualificationResultId)
                .orElseThrow(() -> new ResourceNotFoundException("Não foi encontrado nenhum resultado de qualificação com o ID fornecido."));

        if (qualificationResult.isActive()) {
            throw new IllegalArgumentException("Este resultado de qualificação já está ativo.");
        }

        qualificationResult.setActive(true);

        return toResponse(qualificationResult);
    }

    private QualificationResultResponse toResponse(QualificationResult qualificationResult) {
        return new QualificationResultResponse(
                qualificationResult.getId(),
                qualificationResult.getName(),
                qualificationResult.isActive()
        );
    }
}
